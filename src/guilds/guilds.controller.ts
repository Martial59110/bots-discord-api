import { Controller, Get, Post, Body, Put, Param, Delete, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Guild } from './entities/guild.entity';
import { Logger } from '@nestjs/common';
import axios from 'axios';

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
      // Exécuter le script setup-guild.ts
      const { spawn } = require('child_process');
      const path = require('path');

      return new Promise((resolve, reject) => {
        const setupProcess = spawn('npx', [
          'ts-node',
          path.join(__dirname, '../../../bot-discord-onboarding/src/utils/setup-guild.ts'),
          createGuildDto.uuid
        ]);

        setupProcess.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
        });

        setupProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
        });

        setupProcess.on('close', (code) => {
          if (code === 0) {
            resolve(this.guildService.findOne(createGuildDto.uuid));
          } else {
            reject(new Error(`Le processus s'est terminé avec le code ${code}`));
          }
        });
      });
    } catch (error) {
      throw new HttpException(
        `Erreur lors de la création du serveur: ${error.message}`,
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

  @Post(':uuid/setup')
  @ApiOperation({ summary: 'Configurer un serveur Discord existant' })
  @ApiResponse({ status: 200, description: 'Le serveur a été configuré avec succès.' })
  async setupGuild(@Param('uuid') uuid: string) {
    try {
      logger.log(`🚀 Début de la configuration du serveur ${uuid}...`);

      // 1. Vérifier que la guilde existe dans Discord
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        throw new Error('BOT_TOKEN non défini dans les variables d\'environnement');
      }

      // Récupérer les informations de la guilde depuis l'API Discord
      const discordResponse = await axios.get(`https://discord.com/api/v10/guilds/${uuid}`, {
        headers: {
          'Authorization': `Bot ${botToken}`
        }
      });

      if (!discordResponse.data) {
        throw new Error('Impossible de récupérer les informations de la guilde depuis Discord');
      }

      const guildData = discordResponse.data;

      // 2. Mettre à jour la guilde dans notre base de données
      const updateGuildDto: UpdateGuildDto = {
        name: guildData.name,
        memberCount: guildData.approximate_member_count?.toString() || '0',
        configuration: {}
      };

      await this.guildService.update(uuid, updateGuildDto);
      logger.log('✅ Guilde mise à jour dans la base de données');

      logger.log('✅ Configuration du serveur terminée avec succès !');
      return { message: 'Setup guild completed successfully' };
    } catch (error) {
      logger.error('❌ Erreur lors de la configuration du serveur:', error);
      throw new HttpException(
        error.message || 'Failed to setup guild',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('setup')
  @ApiOperation({ summary: 'Configurer un nouveau serveur Discord' })
  @ApiResponse({ status: 200, description: 'Le serveur a été configuré avec succès.' })
  async setupGuild(@Body() body: { guildId: string }) {
    try {
      logger.log(`🚀 Début de la configuration du serveur ${body.guildId}...`);

      // 1. Vérifier que la guilde existe dans Discord
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        throw new Error('BOT_TOKEN non défini dans les variables d\'environnement');
      }

      // Récupérer les informations de la guilde depuis l'API Discord
      const discordResponse = await axios.get(`https://discord.com/api/v10/guilds/${body.guildId}`, {
        headers: {
          'Authorization': `Bot ${botToken}`
        }
      });

      if (!discordResponse.data) {
        throw new Error('Impossible de récupérer les informations de la guilde depuis Discord');
      }

      const guildData = discordResponse.data;

      // 2. Créer ou mettre à jour la guilde dans notre base de données
      const createGuildDto: CreateGuildDto = {
        uuid: guildData.id,
        name: guildData.name,
        memberCount: guildData.approximate_member_count?.toString() || '0',
        configuration: {}
      };

      try {
        await this.guildService.create(createGuildDto);
        logger.log('✅ Guilde créée/mise à jour dans la base de données');
      } catch (error) {
        if (error.code === '23505') { // Code d'erreur PostgreSQL pour violation de contrainte unique
          await this.guildService.update(body.guildId, createGuildDto);
          logger.log('✅ Guilde mise à jour dans la base de données');
        } else {
          throw error;
        }
      }

      logger.log('✅ Configuration du serveur terminée avec succès !');
      return { message: 'Setup guild completed successfully' };
    } catch (error) {
      logger.error('❌ Erreur lors de la configuration du serveur:', error);
      throw new HttpException(
        error.message || 'Failed to setup guild',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
