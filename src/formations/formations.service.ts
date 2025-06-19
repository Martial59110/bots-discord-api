import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { Formation } from './entities/formation.entity';
import { Role } from '../roles/entities/role.entity';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { ChannelsService } from '../channels/channels.service';
import { ChannelType } from 'discord.js';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import { v4 as uuidv4 } from 'uuid';
import { ThreadTemplate } from './entities/thread-template.entity';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class FormationsService {
  constructor(
    @InjectRepository(Formation)
    private formationRepository: Repository<Formation>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,

    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,

    @InjectRepository(ThreadTemplate)
    private threadTemplateRepository: Repository<ThreadTemplate>,

    private readonly discordBotService: DiscordBotService,
    private readonly channelsService: ChannelsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('FormationsService');
  }

  async create(createFormationDto: CreateFormationDto): Promise<Formation> {
    this.logger.info(`Tentative de création d'une formation "${createFormationDto.name}" pour la guilde ${createFormationDto.uuidGuild}`);
    
    try {
      const discordClient = this.discordBotService.getClient();
      if (!discordClient.user) {
        this.logger.error('Échec de la création de la formation : le bot Discord n\'est pas connecté.');
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }
      
      // Récupérer le serveur Discord
      const guild = await discordClient.guilds.fetch(createFormationDto.uuidGuild as string);
      if (!guild) {
        this.logger.warn(`Serveur Discord non trouvé pour l'UUID : ${createFormationDto.uuidGuild}`);
        throw new BadRequestException('Serveur Discord non trouvé');
      }
      
      this.logger.info(`Création de la catégorie pour la formation "${createFormationDto.name}"`);
      // Créer la catégorie en BDD avec un uuid local
      const category = this.categoryRepository.create({
        uuid: uuidv4(),
        name: createFormationDto.name,
        uuidGuild: createFormationDto.uuidGuild,
        position: 0 // ou à calculer selon besoin
      });
      const savedCategory = await this.categoryRepository.save(category);
      
      // Récupérer les channels à associer
      let channels: Channel[] = [];
      if (createFormationDto.channelIds && createFormationDto.channelIds.length > 0) {
        this.logger.info(`Association de ${createFormationDto.channelIds.length} channels à la formation`);
        channels = await this.channelRepository.findByIds(createFormationDto.channelIds);
      }
      
      this.logger.info(`Création du rôle Discord pour la formation "${createFormationDto.name}"`);
      // Créer le rôle sur Discord
      const role = await guild.roles.create({
        name: `Formation ${createFormationDto.name}`,
        color: '#000000',
        reason: 'Création automatique du rôle pour la formation'
      });
      
      // Créer le rôle dans la base de données
      const newRole = this.roleRepository.create({
        uuidRole: role.id,
        uuidGuild: createFormationDto.uuidGuild,
        name: createFormationDto.name,
        memberCount: 0,
        rolePosition: role.position,
        hoist: false,
        color: role.hexColor,
      });
      const savedRole = await this.roleRepository.save(newRole);
      
      // Créer la formation
      const newFormation = this.formationRepository.create({
        ...createFormationDto,
        uuidRole: savedRole.uuidRole,
        category: savedCategory,
        channels: channels
      });
      const savedFormation = await this.formationRepository.save(newFormation);
      
      // Enregistrer les threads si présents
      if (createFormationDto.threads && createFormationDto.threads.length > 0) {
        this.logger.info(`Traitement de ${createFormationDto.threads.length} threads pour la formation`);
        console.log('Payload threads reçu:', createFormationDto.threads);
        // Filtrage des doublons (forumId + name)
        const uniqueThreadsMap = new Map<string, any>();
        for (const t of createFormationDto.threads) {
          const key = `${t.forumId}::${t.name}`;
          if (!uniqueThreadsMap.has(key)) {
            uniqueThreadsMap.set(key, t);
          }
        }
        const uniqueThreads = Array.from(uniqueThreadsMap.values());
        console.log('Threads après filtrage (unique):', uniqueThreads);
        // Attribuer threadPosition par forum
        const threadsByForum: { [forumId: string]: any[] } = {};
        for (const t of uniqueThreads) {
          if (!threadsByForum[t.forumId]) threadsByForum[t.forumId] = [];
          threadsByForum[t.forumId].push(t);
        }
        Object.values(threadsByForum).forEach((arr: any[]) => {
          arr.sort((a, b) => (a.threadPosition ?? 0) - (b.threadPosition ?? 0));
          arr.forEach((t, idx) => t.threadPosition = idx);
        });
        // Aplatir et insérer
        const threadsToInsert = Object.values(threadsByForum).flat();
        const threadEntities = threadsToInsert.map(t => {
          const thread = this.threadTemplateRepository.create({
            name: t.name,
            forumId: t.forumId,
            threadPosition: t.threadPosition,
            formationUuidFormation: savedFormation.uuidFormation
          });
          return thread;
        });
        await this.threadTemplateRepository.save(threadEntities);
        this.logger.info(`${threadEntities.length} threads créés pour la formation`);
        // Log le contenu inséré en BDD
        const inserted = await this.threadTemplateRepository.find({ where: { formationUuidFormation: savedFormation.uuidFormation } });
        console.log('Threads en BDD après insertion:', inserted);
      }
      
      const result = await this.formationRepository.findOne({
        where: { uuidFormation: savedFormation.uuidFormation },
        relations: ['channels', 'guild', 'category', 'threads']
      });
      if (!result) throw new BadRequestException('Erreur lors de la récupération de la formation après création');
      
      this.logger.info(`Formation "${createFormationDto.name}" (UUID: ${savedFormation.uuidFormation}) créée avec succès.`);
      return result;
    } catch (error) {
      this.logger.error(`Erreur lors de la création de la formation "${createFormationDto.name}"`, error.stack);
      throw new BadRequestException('Erreur lors de la création de la formation: ' + error.message);
    }
  }

  async findAll(page: number = 1, limit: number = 5, search?: string, uuidGuild?: string) {
    this.logger.info(`Récupération des formations - Page: ${page}, Limite: ${limit}, Guilde: ${uuidGuild || 'toutes'}, Recherche: ${search || 'aucune'}`);
    
    const qb = this.formationRepository.createQueryBuilder('formation')
      .leftJoinAndSelect('formation.channels', 'channels')
      .leftJoinAndSelect('formation.guild', 'guild')
      .leftJoinAndSelect('formation.category', 'category')
      .leftJoinAndSelect('formation.threads', 'threads')
      .orderBy('formation.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search && search.trim()) {
      qb.andWhere('LOWER(formation.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }
    if (uuidGuild) {
      qb.andWhere('formation.uuidGuild = :uuidGuild', { uuidGuild });
    }
    const [data, total] = await qb.getManyAndCount();
    
    this.logger.info(`${data.length} formations récupérées sur un total de ${total}`);
    return { data, total, page, limit };
  }

  async findOne(uuidFormation: string) {
    this.logger.info(`Recherche de la formation avec l'UUID : ${uuidFormation}`);
    
    if (!uuidFormation) {
      this.logger.warn('UUID de la formation manquant');
      throw new NotFoundException('UUID de la formation manquant');
    }
    
    const formation = await this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['channels', 'guild', 'category', 'threads']
    });
    
    if (formation) {
      this.logger.info(`Formation trouvée pour l'UUID : ${uuidFormation}`);
    } else {
      this.logger.warn(`Formation non trouvée pour l'UUID : ${uuidFormation}`);
    }
    
    return formation;
  }

  async update(uuidFormation: string, updateFormationDto: UpdateFormationDto) {
    this.logger.info(`Tentative de mise à jour de la formation avec l'UUID : ${uuidFormation}`);
    
    const formation = await this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['channels']
    });
    if (!formation) {
      this.logger.warn(`Mise à jour échouée : Formation non trouvée pour l'UUID : ${uuidFormation}`);
      throw new NotFoundException(`Formation with UUID "${uuidFormation}" not found`);
    }

    // Si le nom change, on met aussi à jour le nom du rôle Discord
    if (updateFormationDto.name && updateFormationDto.name !== formation.name) {
      this.logger.info(`Mise à jour du nom de formation de "${formation.name}" vers "${updateFormationDto.name}"`);
      
      const discordClient = this.discordBotService.getClient();
      if (!discordClient.user) {
        this.logger.error('Échec de la mise à jour : le bot Discord n\'est pas connecté.');
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const guild = await discordClient.guilds.fetch(formation.uuidGuild as string);
      if (!guild) {
        this.logger.warn(`Serveur Discord non trouvé pour la formation ${uuidFormation}`);
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      const role = await guild.roles.fetch(formation.uuidRole);
      if (role) {
        await role.setName(`Formation ${updateFormationDto.name}`, 'Mise à jour du nom de la formation');
        this.logger.info(`Rôle Discord mis à jour pour la formation "${updateFormationDto.name}"`);
      }
    }

    // Mise à jour des channels associés
    if (updateFormationDto.channelIds) {
      this.logger.info(`Mise à jour des channels associés (${updateFormationDto.channelIds.length} channels)`);
      const channels = await this.channelRepository.findByIds(updateFormationDto.channelIds);
      formation.channels = channels;
    }

    if (updateFormationDto.name) {
      formation.name = updateFormationDto.name;
    }

    const updatedFormation = await this.formationRepository.save(formation);
    this.logger.info(`Formation "${updatedFormation.name}" (UUID: ${uuidFormation}) mise à jour avec succès.`);
    
    return this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['channels', 'guild', 'category', 'threads']
    });
  }

  async remove(uuidFormation: string) {
    if (!uuidFormation) {
      throw new NotFoundException(`Formation with UUID "${uuidFormation}" not found`);
    }
    const formation = await this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['category']
    });
    if (!formation) {
      throw new NotFoundException(`Formation with UUID "${uuidFormation}" not found`);
    }

    // Suppression de la catégorie liée si elle existe
    if (formation.category) {
      const categoryUuid = formation.category.uuid;
      formation.category = null;
      await this.formationRepository.save(formation);
      await this.categoryRepository.delete({ uuid: categoryUuid });
    }

    // Suppression du rôle Discord associé
    if (formation.uuidRole && formation.uuidGuild) {
      const discordClient = this.discordBotService.getClient();
      if (discordClient.user) {
        const guild = await discordClient.guilds.fetch(formation.uuidGuild as string);
        if (guild) {
          const role = await guild.roles.fetch(formation.uuidRole);
          if (role) {
            await role.delete('Suppression de la formation');
          }
        }
      }
    }

    return this.formationRepository.delete({ uuidFormation });
  }

  async updateChannelsOrder(uuidFormation: string, channels: { uuid: string, channelPosition: number }[]) {
    const formation = await this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['channels']
    });
    if (!formation) throw new NotFoundException('Formation non trouvée');
    for (const ch of channels) {
      const channel = formation.channels.find(c => c.uuid === ch.uuid);
      if (channel) {
        channel.channelPosition = ch.channelPosition;
        await this.channelRepository.update({ uuid: channel.uuid }, { channelPosition: ch.channelPosition });
      }
    }
    return this.findOne(uuidFormation);
  }

  async updateThreadsOrder(uuidFormation: string, threads: { uuid: string, threadPosition: number }[]) {
    const formation = await this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['threads']
    });
    if (!formation) throw new NotFoundException('Formation non trouvée');
    for (const t of threads) {
      const thread = formation.threads.find(th => th.uuid === t.uuid);
      if (thread) {
        thread.threadPosition = t.threadPosition;
        await this.threadTemplateRepository.update({ uuid: thread.uuid }, { threadPosition: t.threadPosition });
      }
    }
    return { success: true };
  }

  async lookupFormations(search?: string, page: number = 1, limit: number = 20) {
    const qb = this.formationRepository.createQueryBuilder('formation')
      .select(['formation.uuidFormation', 'formation.name', 'formation.uuidGuild'])
      .orderBy('formation.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search && search.trim()) {
      qb.where('LOWER(formation.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
} 