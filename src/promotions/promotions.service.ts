import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { Role } from '../roles/entities/role.entity';
import { Member } from '../members/entities/member.entity';
import { FormationsService } from '../formations/formations.service';
import { Category } from '../categories/entities/category.entity';
import { PinoLogger } from 'nestjs-pino';
import { PromotionsBotService } from './promotions-bot.service';
import { ChannelType } from 'discord.js';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    @InjectRepository(Member)
    private memberRepository: Repository<Member>,

    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,

    private readonly formationsService: FormationsService,
    private readonly promotionsBotService: PromotionsBotService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('PromotionsService');
  }

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    try {
      this.logger.info({ createPromotionDto }, 'Création d\'une nouvelle promotion');
      
      const startDate = new Date(createPromotionDto.startDate);
      const endDate = new Date(createPromotionDto.endDate);

      // Création du rôle Discord
      const discordRole = await this.promotionsBotService.createPromotionRole(
        createPromotionDto.uuidGuild,
        createPromotionDto.name
      );

      // Sauvegarde du rôle en BDD
      const newRole = this.roleRepository.create({
        uuidRole: discordRole.id,
        uuidGuild: createPromotionDto.uuidGuild,
        name: createPromotionDto.name,
        memberCount: 0,
        rolePosition: discordRole.position,
        hoist: false,
        color: discordRole.hexColor,
      });
      const savedRole = await this.roleRepository.save(newRole);

      // Création de la promotion
      const newPromotion = this.promotionRepository.create({
        ...createPromotionDto,
        startDate,
        endDate,
        uuidRole: savedRole.uuidRole,
        uuidCampus: createPromotionDto.uuidCampus
      });
      const savedPromotion = await this.promotionRepository.save(newPromotion);

      // Création de la structure Discord
      const formation = await this.formationsService.findOne(createPromotionDto.uuidFormation);
      if (!formation) throw new NotFoundException('Formation non trouvée');

      // Création de la catégorie Discord
      const category = await this.promotionsBotService.createPromotionCategory(
        createPromotionDto.uuidGuild,
        createPromotionDto.name,
        discordRole.id
      );

      // Sauvegarde de la catégorie en BDD
      await this.categoryRepository.save({
        uuid: category.id,
        name: category.name,
        uuidGuild: createPromotionDto.uuidGuild,
        position: category.position
      });

   
      const sortedChannels = formation.channels.slice().sort((a, b) => (a.channelPosition ?? 0) - (b.channelPosition ?? 0));
      const { createdForums } = await this.promotionsBotService.createPromotionChannels(
        createPromotionDto.uuidGuild,
        category.id,
        sortedChannels
      );

    
      if (formation.threads && formation.threads.length > 0) {
        await this.promotionsBotService.createPromotionThreads(
          createPromotionDto.uuidGuild,
          createdForums,
          formation.threads
        );
      }

      // Mise à jour de la promotion avec l'ID de la catégorie
      savedPromotion.uuidCategory = category.id;
      await this.promotionRepository.save(savedPromotion);

      return savedPromotion;
    } catch (error) {
      this.logger.error({ error }, 'Erreur lors de la création de la promotion');
      throw new BadRequestException('Erreur lors de la création de la promotion: ' + error.message);
    }
  }

  async update(uuid: string, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuid },
      relations: ['followers', 'managers', 'category', 'formation', 'guild', 'role', 'campus']
    });

    if (!promotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuid} non trouvée`);
    }

    const updatedData = {
      ...updatePromotionDto,
      startDate: updatePromotionDto.startDate ? new Date(updatePromotionDto.startDate) : undefined,
      endDate: updatePromotionDto.endDate ? new Date(updatePromotionDto.endDate) : undefined,
      updatedAt: new Date()
    };

    Object.assign(promotion, updatedData);

    // Mise à jour du rôle Discord si le nom est modifié
    if (updatePromotionDto.name && promotion.uuidRole) {
      try {
        await this.promotionsBotService.updatePromotionRole(
          promotion.uuidGuild,
          promotion.uuidRole,
          updatePromotionDto.name
        );
      } catch (error) {
        this.logger.warn({ error }, `Impossible de renommer le rôle Discord ${promotion.uuidRole}`);
      }
    }

    // Mise à jour de la position si spécifiée
    if (typeof updatePromotionDto.position === 'number' && promotion.uuidCategory) {
      try {
        await this.promotionsBotService.updateCategoryPosition(
          promotion.uuidGuild,
          promotion.uuidCategory,
          updatePromotionDto.position
        );

        if (promotion.category) {
          promotion.category.position = updatePromotionDto.position;
          await this.categoryRepository.save(promotion.category);
        }
      } catch (error) {
        this.logger.warn({ error }, 'Erreur lors de la mise à jour de la position de la catégorie');
      }
    }

    return await this.promotionRepository.save(promotion);
  }

  async remove(uuid: string) {
    const promotion = await this.findOne(uuid);
    
    try {
  
      if (promotion.followers) {
        const promoWithCampus = promotion.campus
          ? promotion
          : await this.promotionRepository.findOne({
              where: { uuid_promotion: promotion.uuid_promotion },
              relations: ['campus'],
            });
        for (const member of promotion.followers) {
          if (member.uuidGuild && member.uuidDiscord) {
            try {
              const roleIds = [promotion.uuidRole];
              if (promoWithCampus?.campus?.uuidRole) {
                const otherPromos = await this.promotionRepository
                  .createQueryBuilder('promotion')
                  .innerJoin('promotion.followers', 'follower')
                  .where('promotion.uuid_campus = :uuidCampus', { uuidCampus: promoWithCampus.campus.uuidCampus })
                  .andWhere('follower.uuidMember = :uuidMember', { uuidMember: member.uuidMember })
                  .andWhere('promotion.uuid_promotion != :uuidPromotion', { uuidPromotion: promotion.uuid_promotion })
                  .getCount();
                
                if (otherPromos === 0) {
                  roleIds.push(promoWithCampus.campus.uuidRole);
                }
              }

              await this.promotionsBotService.removeMemberRoles(
                member.uuidGuild,
                member.uuidDiscord,
                roleIds
              );
            } catch (e) {
              this.logger.warn({ error: e }, 'Erreur lors du retrait des rôles Discord');
            }
          }
        }
      }

      // Suppression des channels Discord
      if (promotion.uuidCategory) {
        await this.promotionsBotService.deletePromotionChannels(
          promotion.uuidGuild,
          promotion.uuidCategory
        );
      }

      // Suppression de la promotion de la BDD
      await this.promotionRepository.remove(promotion);
      
      return promotion;
    } catch (error) {
      this.logger.error({ error }, 'Erreur lors de la suppression de la promotion');
      throw new BadRequestException('Erreur lors de la suppression de la promotion : ' + error.message);
    }
  }

  async addFollower(uuidPromotion: string, uuidMember: string): Promise<Promotion> {
    this.logger.info({ uuidPromotion, uuidMember }, 'Tentative d\'ajout d\'un follower à une promotion');

    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuidPromotion }
    });
    if (!promotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuidPromotion} non trouvée`);
    }

    const member = await this.memberRepository.findOneBy({ uuidMember });
    if (!member) {
      throw new NotFoundException(`Membre avec UUID ${uuidMember} non trouvé`);
    }

    const existingRelation = await this.promotionRepository
      .createQueryBuilder('promotion')
      .innerJoin('promotion.followers', 'follower')
      .where('promotion.uuid_promotion = :uuidPromotion', { uuidPromotion })
      .andWhere('follower.uuidMember = :uuidMember', { uuidMember })
      .getOne();

    if (existingRelation) {
      throw new BadRequestException(`Le membre est déjà follower de cette promotion`);
    }

    try {
      await this.promotionRepository
        .createQueryBuilder()
        .relation(Promotion, 'followers')
        .of(promotion.uuid_promotion)
        .add(member.uuidMember);

      if (promotion.uuidRole && member.uuidGuild && member.uuidDiscord) {
        try {
          const roleIds = [promotion.uuidRole];

          const campus = promotion.campus ?? (await this.promotionRepository.createQueryBuilder('promotion')
            .leftJoinAndSelect('promotion.campus', 'campus')
            .where('promotion.uuid_promotion = :uuidPromotion', { uuidPromotion })
            .getOne())?.campus;

          if (campus?.uuidRole) {
            roleIds.push(campus.uuidRole);
          }

          await this.promotionsBotService.addMemberRoles(
            member.uuidGuild,
            member.uuidDiscord,
            roleIds
          );
        } catch (error) {
          this.logger.error({ error }, 'Erreur lors de l\'ajout des rôles Discord');
        }
      }

      const updatedPromotion = await this.promotionRepository.findOne({
        where: { uuid_promotion: uuidPromotion },
        relations: ['followers']
      });
      
      if (!updatedPromotion) {
        throw new NotFoundException(`Promotion avec UUID ${uuidPromotion} non trouvée après mise à jour`);
      }

      return updatedPromotion;
    } catch (error) {
      this.logger.error({ error }, 'Erreur lors de l\'ajout du follower');
      throw error;
    }
  }

  async removeFollower(uuidPromotion: string, uuidMember: string): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuidPromotion },
      relations: ['followers']
    });
    if (!promotion) throw new NotFoundException('Promotion not found');

    const member = await this.memberRepository.findOneBy({ uuidMember });
    if (!member) throw new NotFoundException('Member not found');

    promotion.followers = promotion.followers.filter(f => f.uuidMember !== uuidMember);
    const savedPromotion = await this.promotionRepository.save(promotion);

    if (member.uuidGuild && member.uuidDiscord) {
      try {
        const roleIds = [promotion.uuidRole];

        const promoWithCampus = promotion.campus
          ? promotion
          : await this.promotionRepository.findOne({
              where: { uuid_promotion: uuidPromotion },
              relations: ['campus'],
            });

        if (promoWithCampus?.campus?.uuidRole) {
          const otherPromos = await this.promotionRepository
            .createQueryBuilder('promotion')
            .innerJoin('promotion.followers', 'follower')
            .where('promotion.uuid_campus = :uuidCampus', { uuidCampus: promoWithCampus.campus.uuidCampus })
            .andWhere('follower.uuidMember = :uuidMember', { uuidMember: member.uuidMember })
            .andWhere('promotion.uuid_promotion != :uuidPromotion', { uuidPromotion: promotion.uuid_promotion })
            .getCount();

          if (otherPromos === 0) {
            roleIds.push(promoWithCampus.campus.uuidRole);
          }
        }

        await this.promotionsBotService.removeMemberRoles(
          member.uuidGuild,
          member.uuidDiscord,
          roleIds
        );
      } catch (e) {
        this.logger.warn({ error: e }, 'Erreur lors du retrait des rôles Discord');
      }
    }

    return savedPromotion;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const queryBuilder = this.promotionRepository.createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.category', 'category')
      .leftJoinAndSelect('promotion.guild', 'guild')
      .leftJoinAndSelect('promotion.followers', 'followers')
      .leftJoinAndSelect('promotion.campus', 'campus')
      .orderBy('category.position', 'ASC')
      .addOrderBy('promotion.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
  
    if (search) {
      queryBuilder.where('promotion.name ILIKE :search', { search: `%${search}%` });
    }
  
    const promos = await queryBuilder.getMany();
  
    const dataWithInfos = promos.map(promo => ({
      ...promo,
      guildName: promo.guild?.name ?? promo.uuidGuild,
      memberCount: promo.followers?.length ?? 0,
      categoryPosition: promo.category?.position ?? null
    }));
  
    const total = await this.promotionRepository.count({
      where: search ? { name: ILike(`%${search}%`) } : {}
    });
  
    return { data: dataWithInfos, total, page, limit };
  }

  async findOne(uuid: string): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuid },
      relations: ['followers', 'managers', 'category', 'formation', 'guild', 'role', 'campus']
    });
    
    if (!promotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuid} non trouvée`);
    }
    return promotion;
  }

  async addManager(uuidPromotion: string, uuidMember: string): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuidPromotion },
      relations: ['managers']
    });

    if (!promotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuidPromotion} non trouvée`);
    }

    const member = await this.memberRepository.findOneBy({ uuidMember });
    if (!member) {
      throw new NotFoundException(`Membre avec UUID ${uuidMember} non trouvé`);
    }

    // Vérifier si le membre est déjà manager
    if (promotion.managers && promotion.managers.some(manager => manager.uuidMember === uuidMember)) {
      throw new BadRequestException(`Le membre est déjà manager de cette promotion`);
    }

    // Initialiser le tableau des managers s'il n'existe pas
    if (!promotion.managers) {
      promotion.managers = [];
    }

    // Ajouter le membre aux managers
    promotion.managers.push(member);
    
    // Sauvegarder la promotion mise à jour
    return await this.promotionRepository.save(promotion);
  }

  async setCategoryPosition(uuid: string, position: number): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuid },
      relations: ['category']
    });

    if (!promotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuid} non trouvée`);
    }

    if (!promotion.uuidCategory) {
      throw new BadRequestException('Cette promotion n\'a pas de catégorie associée');
    }

    try {
      const discordClient = this.promotionsBotService.getClient();
      const guild = await discordClient.guilds.fetch(promotion.uuidGuild);
      const category = await guild.channels.fetch(promotion.uuidCategory);
      
      if (category) {
        // 1. Récupérer toutes les catégories du serveur (ordre réel Discord)
        const categoriesArr = Array.from(
          guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.position - b.position)
            .values()
        );

        // 2. Retirer la catégorie à déplacer
        const currentIndex = categoriesArr.findIndex(c => c.id === category.id);
        if (currentIndex === -1) throw new NotFoundException('Catégorie non trouvée dans Discord');
        const [removed] = categoriesArr.splice(currentIndex, 1);

        // 3. Insérer à la nouvelle position
        categoriesArr.splice(position, 0, removed);

        // 4. Appliquer le bulk update sur Discord
        const positions = categoriesArr.map((c, idx) => ({
          channel: c.id,
          position: idx
        }));
        await guild.channels.setPositions(positions);

        // 5. Mettre à jour la BDD pour les promotions concernées
        const allPromos = await this.promotionRepository.find({
          where: { uuidGuild: promotion.uuidGuild },
          relations: ['category']
        });
        for (let idx = 0; idx < categoriesArr.length; idx++) {
          const promo = allPromos.find(p => p.category && p.category.uuid === categoriesArr[idx].id);
          if (promo && promo.category) {
            promo.category.position = idx;
            await this.categoryRepository.save(promo.category);
          }
        }
      }

      return promotion;
    } catch (error) {
      console.error('Erreur lors de la modification de la position de la catégorie:', error);
      throw new BadRequestException('Erreur lors de la modification de la position de la catégorie: ' + error.message);
    }
  }

  async getPromotionMembers(uuid: string) {
    const promo = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuid },
      relations: ['followers', 'followers.discordUser']
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo.followers || [];
  }
}
