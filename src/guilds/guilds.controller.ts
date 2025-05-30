import { Controller, Get, Post, Body, Put, Param, Delete, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Guild } from './entities/guild.entity';
import { Logger } from '@nestjs/common';

const logger = new Logger('GuildsController');

@ApiTags('guilds')
@Controller('guilds')
export class GuildsController {
  constructor(private readonly guildService: GuildsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau serveur Discord' })
  @ApiResponse({ status: 201, description: 'Le serveur a été créé avec succès.', type: Guild })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  async create(@Body() createGuildDto: CreateGuildDto) {
    try {
      logger.log(`🚀 Début de la création du serveur ${createGuildDto.uuid}...`);
      const guild = await this.guildService.create(createGuildDto);
      logger.log('✅ Serveur créé avec succès !');
      return guild;
    } catch (error) {
      logger.error('❌ Erreur lors de la création du serveur:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la création du serveur',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les serveurs Discord' })
  @ApiResponse({ status: 200, description: 'Liste des serveurs récupérée avec succès.', type: [Guild] })
  findAll() {
    return this.guildService.findAll();
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Récupérer un serveur Discord par son UUID' })
  @ApiResponse({ status: 200, description: 'Le serveur a été trouvé.', type: Guild })
  @ApiResponse({ status: 404, description: 'Serveur non trouvé' })
  findOne(@Param('uuid') uuid: string) {
    return this.guildService.findOne(uuid);
  }

  @Put(':uuid')
  @ApiOperation({ summary: 'Mettre à jour un serveur Discord' })
  @ApiResponse({ status: 200, description: 'Le serveur a été mis à jour avec succès.', type: Guild })
  @ApiResponse({ status: 404, description: 'Serveur non trouvé' })
  async update(@Param('uuid') uuid: string, @Body() updateGuildDto: UpdateGuildDto) {
    const guild = await this.guildService.update(uuid, updateGuildDto);
    if (!guild) {
      throw new NotFoundException(`Guild with UUID "${uuid}" not found`);
    }
    return guild;
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Supprimer un serveur Discord' })
  @ApiResponse({ status: 200, description: 'Le serveur a été supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Serveur non trouvé' })
  remove(@Param('uuid') uuid: string) {
    return this.guildService.remove(uuid);
  }

  @Get(':uuidGuild/discord-roles')
  async getDiscordRoles(@Param('uuidGuild') uuidGuild: string) {
    const guild = await this.guildService.getDiscordGuild(uuidGuild);
    const roles = guild.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => ({ id: role.id, name: role.name, color: role.color }));
    return roles;
  }

  @Get(':uuidGuild/formations')
  @ApiOperation({ summary: 'Récupérer les formations d\'un serveur Discord' })
  @ApiResponse({ status: 200, description: 'Liste des formations récupérée avec succès.' })
  @ApiResponse({ status: 404, description: 'Serveur non trouvé' })
  async getFormations(@Param('uuidGuild') uuidGuild: string) {
    return this.guildService.getFormations(uuidGuild);
  }

  @Get(':uuidGuild/promotion-members-count')
  async getPromotionMembersCount(@Param('uuidGuild') uuidGuild: string) {
    return this.guildService.getPromotionMembersCount(uuidGuild);
  }
}
