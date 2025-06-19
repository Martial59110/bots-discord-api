import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { Guild } from './entities/guild.entity';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { Formation } from '../formations/entities/formation.entity';
import { Member } from '../members/entities/member.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class GuildsService {
  constructor(
    @InjectRepository(Guild)
    private readonly guildRepository: Repository<Guild>,
    private readonly discordBotService: DiscordBotService,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('GuildsService');
  }

  // Créer une nouvelle guild
  async create(createGuildDto: CreateGuildDto): Promise<Guild> {
    this.logger.info(`Tentative de création d'une guilde avec l'UUID : ${createGuildDto.uuid}`);
    
    try {
      const discordClient = this.discordBotService.getClient();
      
      if (!discordClient.user) {
        this.logger.error('Échec de la création de la guilde : le bot Discord n\'est pas connecté.');
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const discordGuild = await discordClient.guilds.fetch(createGuildDto.uuid);

      if (!discordGuild) {
        this.logger.warn(`Serveur Discord non trouvé pour l'UUID : ${createGuildDto.uuid}`);
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      // Vérifier si le bot est présent dans le serveur
      const botMember = await discordGuild.members.fetch(discordClient.user.id);
      if (!botMember) {
        this.logger.warn(`Le bot n'est pas présent sur le serveur Discord ${createGuildDto.uuid}`);
        throw new BadRequestException('Le bot n\'est pas présent dans ce serveur');
      }

      // Créer la guild avec les informations du serveur Discord
      const guild = this.guildRepository.create({
        uuid: discordGuild.id,
        name: discordGuild.name,
        memberCount: discordGuild.memberCount.toString(),
        configuration: {
          icon: discordGuild.iconURL(),
          ownerId: discordGuild.ownerId,
          createdAt: discordGuild.createdAt,
        }
      });

      const savedGuild = await this.guildRepository.save(guild);
      this.logger.info(`Guilde "${savedGuild.name}" (UUID: ${savedGuild.uuid}) créée avec succès.`);
      return savedGuild;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la création de la guilde ${createGuildDto.uuid}`, error.stack);
      throw new BadRequestException('Erreur lors de la récupération des informations du serveur Discord');
    }
  }

  async findAll(): Promise<any[]> {
    this.logger.info('Récupération de toutes les guildes.');
    const guilds = await this.guildRepository.find({
      select: ['uuid', 'name', 'memberCount', 'configuration', 'createdAt', 'updatedAt']
    });
    /****** Pour chaque guilde, cela va compter les membres *******/
    for (const guild of guilds) {
      guild.memberCount = (await this.memberRepository.count({ where: { uuidGuild: guild.uuid } })).toString();
    }
    this.logger.info(`${guilds.length} guildes récupérées.`);
    return guilds;
  }

  async findOne(uuid: string): Promise<Guild> {
    this.logger.info(`Recherche de la guilde avec l'UUID : ${uuid}`);
    const guild = await this.guildRepository.findOne({
      where: { uuid },
      relations: ['formations', 'members', 'roles', 'channels', 'categories', 'campuses', 'promotions', 'template']
    });

    if (!guild) {
      this.logger.warn(`Guilde non trouvée pour l'UUID : ${uuid}`);
      throw new NotFoundException(`Guild with UUID "${uuid}" not found`);
    }

    this.logger.info(`Guilde "${guild.name}" trouvée.`);
    return guild;
  }

  // Mettre à jour une guild
  async update(uuid: string, updateGuildDto: UpdateGuildDto): Promise<Guild> {
    this.logger.info(`Tentative de mise à jour de la guilde avec l'UUID : ${uuid}`);
    const guild = await this.findOne(uuid);
    
    // Mise à jour des propriétés
    if (updateGuildDto.name) guild.name = updateGuildDto.name;
    if (updateGuildDto.memberCount) guild.memberCount = updateGuildDto.memberCount;
    if (updateGuildDto.configuration) guild.configuration = updateGuildDto.configuration;
    
    const updatedGuild = await this.guildRepository.save(guild);
    this.logger.info(`Guilde "${updatedGuild.name}" (UUID: ${uuid}) mise à jour avec succès.`);
    return updatedGuild;
  }

  // Supprimer une guild
  async remove(uuid: string): Promise<void> {
    this.logger.info(`Tentative de suppression de la guilde avec l'UUID : ${uuid}`);
    
    // Récupérer la guilde pour avoir son nom avant suppression
    const guild = await this.guildRepository.findOne({ where: { uuid } });
    if (!guild) {
      this.logger.warn(`Suppression échouée : Guilde non trouvée pour l'UUID : ${uuid}`);
      throw new NotFoundException(`Guild with UUID "${uuid}" not found`);
    }

    const result = await this.guildRepository.delete({ uuid });
    
    if (result.affected === 0) {
      this.logger.warn(`Aucune guilde supprimée pour l'UUID : ${uuid}`);
      throw new NotFoundException(`Guild with UUID "${uuid}" not found`);
    }

    this.logger.info(`Guilde "${guild.name}" (UUID: ${uuid}) supprimée avec succès.`);
  }

  async getDiscordGuild(uuidGuild: string): Promise<any> {
    this.logger.info(`Récupération des informations Discord pour la guilde : ${uuidGuild}`);
    const discordClient = this.discordBotService.getClient();
    return await discordClient.guilds.fetch(uuidGuild);
  }

  async getFormations(uuidGuild: string) {
    this.logger.info(`Récupération des formations pour la guilde : ${uuidGuild}`);
    const guild = await this.findOne(uuidGuild);
    if (!guild) {
      throw new NotFoundException(`Guild with UUID "${uuidGuild}" not found`);
    }
    const formations = await this.formationRepository.find({
      where: { uuidGuild },
      relations: ['guild']
    });
    this.logger.info(`${formations.length} formations trouvées pour la guilde ${uuidGuild}.`);
    return formations;
  }

  async getPromotionMembersCount(uuidGuild: string): Promise<{ count: number }> {
    this.logger.info(`Calcul du nombre de membres des promotions pour la guilde : ${uuidGuild}`);
    const promotions = await this.promotionRepository.find({ where: { uuidGuild }, relations: ['followers'] });
    const memberIds = new Set<string>();
    for (const promo of promotions) {
      for (const follower of promo.followers) {
        memberIds.add(follower.uuidMember);
      }
    }
    this.logger.info(`${memberIds.size} membres uniques trouvés dans les promotions de la guilde ${uuidGuild}.`);
    return { count: memberIds.size };
  }
}
