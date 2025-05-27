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
  ) {}

  async create(createFormationDto: CreateFormationDto): Promise<Formation> {
    try {
      const discordClient = this.discordBotService.getClient();
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }
      // Récupérer le serveur Discord
      const guild = await discordClient.guilds.fetch(createFormationDto.uuidGuild as string);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }
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
        channels = await this.channelRepository.findByIds(createFormationDto.channelIds);
      }
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
        const threadEntities = createFormationDto.threads.map(t => {
          const thread = this.threadTemplateRepository.create({
            name: t.name,
            forumId: t.forumId,
            formation: savedFormation
          });
          return thread;
        });
        await this.threadTemplateRepository.save(threadEntities);
      }
      const result = await this.formationRepository.findOne({
        where: { uuidFormation: savedFormation.uuidFormation },
        relations: ['channels', 'guild', 'category', 'threads']
      });
      if (!result) throw new BadRequestException('Erreur lors de la récupération de la formation après création');
      return result;
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création de la formation: ' + error.message);
    }
  }

  findAll() {
    return this.formationRepository.find({
      relations: ['channels', 'guild', 'category', 'threads']
    });
  }

  findOne(uuidFormation: string) {
    if (!uuidFormation) {
      throw new NotFoundException('UUID de la formation manquant');
    }
    return this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['channels', 'guild', 'category', 'threads']
    });
  }

  async update(uuidFormation: string, updateFormationDto: UpdateFormationDto) {
    const formation = await this.formationRepository.findOne({
      where: { uuidFormation },
      relations: ['channels']
    });
    if (!formation) {
      throw new NotFoundException(`Formation with UUID "${uuidFormation}" not found`);
    }

    // Si le nom change, on met aussi à jour le nom du rôle Discord
    if (updateFormationDto.name && updateFormationDto.name !== formation.name) {
      const discordClient = this.discordBotService.getClient();
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const guild = await discordClient.guilds.fetch(formation.uuidGuild as string);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      const role = await guild.roles.fetch(formation.uuidRole);
      if (role) {
        await role.setName(`Formation ${updateFormationDto.name}`, 'Mise à jour du nom de la formation');
      }
    }

    // Mise à jour des channels associés
    if (updateFormationDto.channelIds) {
      const channels = await this.channelRepository.findByIds(updateFormationDto.channelIds);
      formation.channels = channels;
    }

    if (updateFormationDto.name) {
      formation.name = updateFormationDto.name;
    }

    return this.formationRepository.save(formation);
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
} 