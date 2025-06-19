import { Injectable, BadRequestException } from '@nestjs/common';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { Role } from 'discord.js';

@Injectable()
export class CampusBotService {
  constructor(
    private readonly discordBotService: DiscordBotService,
  ) {}

  async createCampusRole(guildId: string, campusName: string): Promise<Role> {
    try {
      const discordClient = this.discordBotService.getClient();
      
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const guild = await discordClient.guilds.fetch(guildId);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      const role = await guild.roles.create({
        name: `Campus ${campusName}`,
        color: '#000000',
        reason: 'Création automatique du rôle pour le campus'
      });

      return role;
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création du rôle Discord: ' + error.message);
    }
  }

  async updateCampusRole(guildId: string, roleId: string, newName: string): Promise<void> {
    try {
      const discordClient = this.discordBotService.getClient();
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const guild = await discordClient.guilds.fetch(guildId);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      const role = await guild.roles.fetch(roleId);
      if (role) {
        await role.setName(`Campus ${newName}`, 'Mise à jour du nom du campus');
      }
    } catch (error) {
      throw new BadRequestException('Erreur lors de la mise à jour du rôle Discord: ' + error.message);
    }
  }

  async deleteCampusRole(guildId: string, roleId: string): Promise<void> {
    try {
      const discordClient = this.discordBotService.getClient();
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const guild = await discordClient.guilds.fetch(guildId);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      const role = await guild.roles.fetch(roleId);
      if (role) {
        await role.delete('Suppression du campus');
      }
    } catch (error) {
      throw new BadRequestException('Erreur lors de la suppression du rôle Discord: ' + error.message);
    }
  }
} 