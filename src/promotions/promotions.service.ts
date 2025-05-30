import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { Role } from '../roles/entities/role.entity';
import { Member } from '../members/entities/member.entity';
import { FormationsService } from '../formations/formations.service';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { ChannelType } from 'discord.js';
import { Category } from '../categories/entities/category.entity';

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
    private readonly discordBotService: DiscordBotService,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    try {
      console.log('Payload reçu pour création de promotion :', createPromotionDto);
      // --- CRÉATION DU RÔLE SUR DISCORD ---
      const discordClient = this.discordBotService.getClient();
      const guild = await discordClient.guilds.fetch(createPromotionDto.uuidGuild);
      const discordRole = await guild.roles.create({
        name: createPromotionDto.name,
        color: '#000000',
        reason: 'Création automatique du rôle pour la promotion'
      });
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
      // Création de la promotion avec le rôle associé
      const newPromotion = this.promotionRepository.create({
        ...createPromotionDto,
        uuidRole: savedRole.uuidRole, // Associe le rôle créé à la promotion
      });
      const savedPromotion = await this.promotionRepository.save(newPromotion);

      // --- LOGIQUE DISCORD POUR LA STRUCTURE ---
      const formation = await this.formationsService.findOne(createPromotionDto.uuidFormation);
      if (!formation) throw new NotFoundException('Formation non trouvée');
      // Créer la catégorie Discord
      const category = await guild.channels.create({
        name: createPromotionDto.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: ['ViewChannel'],
          },
          {
            id: discordRole.id, // Le rôle de la promotion
            allow: ['ViewChannel'],
          }
        ]
      });
      console.log('Catégorie Discord créée :', category.id, 'type:', category.type);
      await new Promise(resolve => setTimeout(resolve, 500));
      // Créer la catégorie en BDD
      await this.categoryRepository.save({
        uuid: category.id,
        name: category.name,
        uuidGuild: createPromotionDto.uuidGuild,
        position: category.position
      });
      // 1. Créer tous les channels et stocker les forums créés
      const sortedChannels = formation.channels.slice().sort((a, b) => (a.channelPosition ?? 0) - (b.channelPosition ?? 0));
      const createdForums: { [templateForumId: string]: string } = {};
      const createdChannels: any[] = [];
      for (const ch of sortedChannels) {
        const channelType = this.mapChannelType(ch.type);
        let channelData: any = {
          name: ch.name,
          type: channelType,
          position: ch.channelPosition
        };
        if (category && category.type === ChannelType.GuildCategory) {
          channelData.parent = category.id;
        }
        if (channelType === ChannelType.GuildForum) {
          channelData = {
            name: ch.name,
            type: channelType,
            position: ch.channelPosition,
            parent: channelData.parent
          };
        }
        console.log('Création channel Discord (nettoyé) :', channelData);
        const createdChannel = await guild.channels.create(channelData);
        createdChannels.push(createdChannel);
        // Si c'est un forum, mappe l'ID du template à l'ID Discord créé
        if (channelType === ChannelType.GuildForum && ch.uuid) {
          createdForums[ch.uuid] = createdChannel.id;
        }
      }
      // Attendre la propagation Discord (par exemple 1 seconde)
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Récupérer tous les channels enfants de la catégorie (hors threads)
      const validTypes = [0, 2, 5, 15]; // 0: GUILD_TEXT, 2: GUILD_VOICE, 5: GUILD_ANNOUNCEMENT, 15: GUILD_FORUM
      const allCategoryChannels = guild.channels.cache
        .filter(c => c.parentId === category.id && validTypes.includes(c.type))
        .sort((a, b) => (Number((a as any).rawPosition ?? 0) - Number((b as any).rawPosition ?? 0)));
      // Construire l'ordre final (channels du template d'abord, puis les autres)
      const finalOrder = sortedChannels.map((ch) => {
        const discordChannel = allCategoryChannels.find(dc => dc.name === ch.name && dc.type === this.mapChannelType(ch.type));
        return discordChannel
          ? { channel: discordChannel.id, position: Number(ch.channelPosition) }
          : null;
      }).filter((f): f is { channel: string; position: number } => f !== null);
      // Ajouter les autres channels de la catégorie à la fin
      allCategoryChannels.forEach((c, idx) => {
        if (!finalOrder.find(f => f.channel === c.id)) {
          finalOrder.push({ channel: c.id, position: Number(sortedChannels.length + idx) });
        }
      });
      try {
        await guild.channels.setPositions(finalOrder);
      } catch (e) {
        console.warn('Erreur lors du bulk setPositions des channels', e);
      }
      // 2. Créer les threads dans les forums créés
      if (formation.threads && formation.threads.length > 0) {
        const sortedThreads = formation.threads.slice().sort((a, b) => (a.threadPosition ?? 0) - (b.threadPosition ?? 0));
        for (const thread of sortedThreads.reverse()) {
          // Récupère l'ID Discord du forum à partir de l'ID du template
          const discordForumId = createdForums[thread.forumId];
          const forum = guild.channels.cache.get(discordForumId);
          console.log('Création thread dans forum', discordForumId, 'type:', forum?.type);
          if (forum && forum.type === ChannelType.GuildForum && typeof (forum as any).threads?.create === 'function') {
            await (forum as any).threads.create({ name: thread.name, message: { content: "Bienvenue dans ce thread !" } });
          } else {
            console.warn('Impossible de créer le thread, forumId non trouvé ou mauvais type:', discordForumId, forum?.type);
          }
        }
      }
      // Mettre à jour la promotion avec l'ID de la catégorie Discord
      savedPromotion.uuidCategory = category.id;
      await this.promotionRepository.save(savedPromotion);
      return savedPromotion;
    } catch (error) {
      console.error('Erreur complète lors de la création de la promotion :', error);
      throw new BadRequestException('Erreur lors de la création de la promotion: ' + error.message);
    }
  }

  mapChannelType(type: string) {
    switch (type) {
      case 'text': return ChannelType.GuildText;
      case 'voice': return ChannelType.GuildVoice;
      case 'forum': return ChannelType.GuildForum;
      case 'announcement': return ChannelType.GuildAnnouncement;
      default: return ChannelType.GuildText;
    }
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const queryBuilder = this.promotionRepository.createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.category', 'category')
      .leftJoinAndSelect('promotion.guild', 'guild')
      .leftJoinAndSelect('promotion.followers', 'followers')
      .select([
        'promotion.uuid_promotion',
        'promotion.name',
        'promotion.status',
        'promotion.uuidGuild',
        'promotion.createdAt',
        'category.position',
        'guild.name',
        'guild.uuid',
      ])
      .orderBy('category.position', 'ASC')
      .addOrderBy('promotion.createdAt', 'DESC');

    if (search) {
      queryBuilder.where('promotion.name ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // On enrichit la réponse pour le front
    const dataWithInfos = data.map(promo => ({
      ...promo,
      guildName: promo.guild?.name ?? promo.uuidGuild,
      memberCount: promo.followers?.length ?? 0,
      categoryPosition: promo.category?.position ?? null
    }));

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

  async update(uuid: string, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuid },
      relations: ['followers', 'managers', 'category', 'formation', 'guild', 'role', 'campus']
    });

    if (!promotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuid} non trouvée`);
    }

    // Mise à jour des champs autorisés
    Object.assign(promotion, updatePromotionDto);
    promotion.updatedAt = new Date();

    // Si le nom est modifié, mettre à jour le rôle Discord
    if (updatePromotionDto.name && promotion.uuidRole) {
      try {
        const discordClient = this.discordBotService.getClient();
        const guild = await discordClient.guilds.fetch(promotion.uuidGuild);
        const role = await guild.roles.fetch(promotion.uuidRole);
        if (role) {
          await role.setName(updatePromotionDto.name, 'Mise à jour du nom de la promotion');
          console.log(`Rôle Discord renommé : ${promotion.uuidRole}`);
        }
      } catch (error) {
        console.warn(`Impossible de renommer le rôle Discord ${promotion.uuidRole}:`, error);
      }
    }

    // Si la position est spécifiée, mettre à jour la position sur Discord
    if (typeof updatePromotionDto.position === 'number' && promotion.uuidCategory) {
      try {
        const discordClient = this.discordBotService.getClient();
        const guild = await discordClient.guilds.fetch(promotion.uuidGuild);
        const category = await guild.channels.fetch(promotion.uuidCategory);

        if (category) {
          // Récupérer toutes les catégories du serveur
          const categoriesArr = Array.from(guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.position - b.position)
            .values());

          // Retirer la catégorie à déplacer
          const otherCategories = categoriesArr.filter(c => c.id !== category.id);
          // Insérer la catégorie à la bonne position
          const newCategories = [
            ...otherCategories.slice(0, updatePromotionDto.position),
            category,
            ...otherCategories.slice(updatePromotionDto.position)
          ];

          // Construire le tableau de positions
          const positions = newCategories.map((c, idx) => ({
            channel: c.id,
            position: idx
          }));

          await guild.channels.setPositions(positions);

          // Mettre à jour la position en BDD
          if (promotion.category) {
            promotion.category.position = updatePromotionDto.position;
            await this.categoryRepository.save(promotion.category);
          }
        }
      } catch (error) {
        console.warn('Erreur lors de la mise à jour de la position de la catégorie:', error);
      }
    }

    return await this.promotionRepository.save(promotion);
  }

  async remove(uuid: string) {
    const promotion = await this.findOne(uuid);
    
    try {
      const discordClient = this.discordBotService.getClient();
      // Retirer le rôle Discord à tous les followers
      if (promotion.followers && promotion.uuidRole) {
        for (const member of promotion.followers) {
          if (member.uuidGuild && member.uuidDiscord) {
            try {
              const guild = await discordClient.guilds.fetch(member.uuidGuild);
              const guildMember = await guild.members.fetch(member.uuidDiscord);
              await guildMember.roles.remove(promotion.uuidRole);
            } catch (e) {
              // Optionnel : log ou ignorer si le membre n'est pas sur le serveur
            }
          }
        }
      }

      // 2. Supprimer la catégorie et tous ses channels
      if (promotion.uuidCategory) {
        try {
          const guild = await discordClient.guilds.fetch(promotion.uuidGuild);
          const category = await guild.channels.fetch(promotion.uuidCategory);
          if (category) {
            // Supprimer tous les channels de la catégorie
            const channels = guild.channels.cache.filter(c => c.parentId === promotion.uuidCategory && c.type !== ChannelType.GuildCategory.valueOf());
            for (const channel of channels.values()) {
              try {
                await channel.delete('Suppression de la promotion');
                console.log(`Channel Discord supprimé : ${channel.id}`);
              } catch (error) {
                console.warn(`Impossible de supprimer le channel ${channel.id}:`, error);
              }
            }
            // Supprimer la catégorie elle-même
            await category.delete('Suppression de la promotion');
            console.log(`Catégorie Discord supprimée : ${promotion.uuidCategory}`);
          }
        } catch (error) {
          console.warn(`Impossible de supprimer la catégorie Discord ${promotion.uuidCategory}:`, error);
        }
      }

      // 3. Supprimer la promotion de la base de données
      await this.promotionRepository.remove(promotion);
      console.log(`Promotion supprimée de la base de données : ${uuid}`);
      
      return promotion;
    } catch (error) {
      console.error('Erreur lors de la suppression de la promotion :', error);
      throw new BadRequestException('Erreur lors de la suppression de la promotion : ' + error.message);
    }
  }

  async addFollower(uuidPromotion: string, uuidMember: string): Promise<Promotion> {
    console.log('=== DÉBUT addFollower ===');
    console.log('Paramètres reçus:', { uuidPromotion, uuidMember });

    // Vérifier que la promotion existe
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuidPromotion }
    });
    if (!promotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuidPromotion} non trouvée`);
    }

    // Vérifier que le membre existe
    const member = await this.memberRepository.findOneBy({ uuidMember });
    if (!member) {
      throw new NotFoundException(`Membre avec UUID ${uuidMember} non trouvé`);
    }

    // Vérifier si le membre est déjà follower
    const existingRelation = await this.promotionRepository
      .createQueryBuilder('promotion')
      .innerJoin('promotion.followers', 'follower')
      .where('promotion.uuid_promotion = :uuidPromotion', { uuidPromotion })
      .andWhere('follower.uuidMember = :uuidMember', { uuidMember })
      .getOne();

    if (existingRelation) {
      throw new BadRequestException(`Le membre est déjà follower de cette promotion`);
    }

    // Insérer directement dans la table de jointure
    await this.promotionRepository
    .createQueryBuilder()
    .relation(Promotion, 'followers')
    .of(promotion.uuid_promotion) // UUID pur, pas l'objet
    .add(member.uuidMember);      // UUID pur, pas l'objet
  ;

    // --- AJOUT DU RÔLE DISCORD ---
    if (promotion.uuidRole && member.uuidGuild && member.uuidDiscord) {
      try {
        const discordClient = this.discordBotService.getClient();
        const guild = await discordClient.guilds.fetch(member.uuidGuild);
        const guildMember = await guild.members.fetch(member.uuidDiscord);
        await guildMember.roles.add(promotion.uuidRole);
      } catch (e) {
        console.error('Erreur lors de l\'ajout du rôle Discord:', e);
      }
    }

    // Retourner la promotion mise à jour
    const updatedPromotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuidPromotion },
      relations: ['followers']
    });
    
    if (!updatedPromotion) {
      throw new NotFoundException(`Promotion avec UUID ${uuidPromotion} non trouvée après mise à jour`);
    }
    
    return updatedPromotion;
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
      const discordClient = this.discordBotService.getClient();
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

  async removeFollower(uuidPromotion: string, uuidMember: string): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid_promotion: uuidPromotion },
      relations: ['followers']
    });
    if (!promotion) throw new NotFoundException('Promotion not found');

    const member = await this.memberRepository.findOneBy({ uuidMember });
    if (!member) throw new NotFoundException('Member not found');

    // Retirer le membre des followers
    promotion.followers = promotion.followers.filter(f => f.uuidMember !== uuidMember);
    const savedPromotion = await this.promotionRepository.save(promotion);

    // --- RETRAIT DU RÔLE DISCORD ---
    if (promotion.uuidRole && member.uuidGuild && member.uuidDiscord) {
      try {
        const discordClient = this.discordBotService.getClient();
        const guild = await discordClient.guilds.fetch(member.uuidGuild);
        const guildMember = await guild.members.fetch(member.uuidDiscord);
        await guildMember.roles.remove(promotion.uuidRole);
      } catch (e) {
        // Optionnel : log ou ignorer si le membre n'est pas sur le serveur
      }
    }

    return savedPromotion;
  }
}
