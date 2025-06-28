/* 
 * Service dédié aux interactions Discord pour les campus
 * 
 * Ce service s'occupe de toute la partie Discord quand on gère les campus :
 * - Créer un rôle Discord quand on crée un campus
 * - Modifier le nom du rôle quand on modifie le campus
 * - Supprimer le rôle quand on supprime le campus
 * 
 * C'est une couche d'abstraction entre notre app et l'API Discord
 * pour gérer proprement les erreurs et la logique métier
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { Role } from 'discord.js';

@Injectable()
export class CampusBotService {
  constructor(
    private readonly discordBotService: DiscordBotService, /* Service principal du bot Discord */
  ) {}

  /* 
   * Crée un nouveau rôle Discord pour un campus
   * 
   * Le rôle aura le format "Campus {nom}" (ex: "Campus Paris")
   * et sera créé dans le serveur Discord spécifié
   * 
   * Retourne l'objet Role Discord créé
   */
  async createCampusRole(guildId: string, campusName: string): Promise<Role> {
    try {
      const discordClient = this.discordBotService.getClient();
      
      /* Vérification que le bot est bien connecté */
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      /* Récupération du serveur Discord */
      const guild = await discordClient.guilds.fetch(guildId);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      /* Création du rôle avec le nom du campus */
      const role = await guild.roles.create({
        name: `Campus ${campusName}`,
        color: '#000000', /* Couleur par défaut noire */
        reason: 'Création automatique du rôle pour le campus'
      });

      return role;
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création du rôle Discord: ' + error.message);
    }
  }

  /* 
   * Met à jour le nom d'un rôle Discord existant
   * 
   * Utilisé quand on modifie le nom d'un campus
   * pour garder la cohérence entre notre base et Discord
   */
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

      /* Récupération et mise à jour du rôle */
      const role = await guild.roles.fetch(roleId);
      if (role) {
        await role.setName(`Campus ${newName}`, 'Mise à jour du nom du campus');
      }
    } catch (error) {
      throw new BadRequestException('Erreur lors de la mise à jour du rôle Discord: ' + error.message);
    }
  }

  /* 
   * Supprime un rôle Discord
   * 
   * Utilisé quand on supprime un campus
   * pour nettoyer les rôles Discord orphelins
   */
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

      /* Récupération et suppression du rôle */
      const role = await guild.roles.fetch(roleId);
      if (role) {
        await role.delete('Suppression du campus');
      }
    } catch (error) {
      throw new BadRequestException('Erreur lors de la suppression du rôle Discord: ' + error.message);
    }
  }
} 