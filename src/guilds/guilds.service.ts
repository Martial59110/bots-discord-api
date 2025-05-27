import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { Guild } from './entities/guild.entity';
import { DiscordBotService } from '../discord-bot/discord-bot.service';

@Injectable()
export class GuildsService {
  constructor(
    @InjectRepository(Guild)
    private readonly guildRepository: Repository<Guild>,
    private readonly discordBotService: DiscordBotService,
  ) {}

  // Créer une nouvelle guild
  async create(createGuildDto: CreateGuildDto): Promise<Guild> {
    try {
      const discordClient = this.discordBotService.getClient();
      
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const discordGuild = await discordClient.guilds.fetch(createGuildDto.uuid);

      if (!discordGuild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      // Vérifier si le bot est présent dans le serveur
      const botMember = await discordGuild.members.fetch(discordClient.user.id);
      if (!botMember) {
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

      return await this.guildRepository.save(guild);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la récupération des informations du serveur Discord');
    }
  }

  // Récupérer toutes les guilds
  async findAll(): Promise<Guild[]> {
    return await this.guildRepository.find({
      relations: ['formations', 'members', 'roles', 'channels', 'categories', 'campuses', 'promotions', 'template']
    });
  }

  // Récupérer une guild par son uuid
  async findOne(uuid: string): Promise<Guild> {
    const guild = await this.guildRepository.findOne({
      where: { uuid },
      relations: ['formations', 'members', 'roles', 'channels', 'categories', 'campuses', 'promotions', 'template']
    });

    if (!guild) {
      throw new NotFoundException(`Guild with UUID "${uuid}" not found`);
    }

    return guild;
  }

  // Mettre à jour une guild
  async update(uuid: string, updateGuildDto: UpdateGuildDto): Promise<Guild> {
    const guild = await this.findOne(uuid);
    
    // Mise à jour des propriétés
    if (updateGuildDto.name) guild.name = updateGuildDto.name;
    if (updateGuildDto.memberCount) guild.memberCount = updateGuildDto.memberCount;
    if (updateGuildDto.configuration) guild.configuration = updateGuildDto.configuration;
    
    return await this.guildRepository.save(guild);
  }

  // Supprimer une guild
  async remove(uuid: string): Promise<void> {
    const result = await this.guildRepository.delete({ uuid });
    
    if (result.affected === 0) {
      throw new NotFoundException(`Guild with UUID "${uuid}" not found`);
    }
  }
}
