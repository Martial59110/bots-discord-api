/* 
 * Tests pour le service CampusBotService
 * 
 * Ces tests vérifient que le service gère correctement les interactions avec Discord :
 * - Création de rôles Discord pour les campus
 * - Mise à jour des noms de rôles
 * - Suppression de rôles
 * - Gestion des erreurs (bot déconnecté, serveur introuvable, etc.)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CampusBotService } from './campus-bot.service';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { BadRequestException } from '@nestjs/common';
import { Role, Guild, Client } from 'discord.js';

/* Mock d'un rôle Discord pour simuler les opérations */
const mockRole = {
  id: '123456789012345678',
  name: 'Campus Test',
  setName: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
} as unknown as Role;

/* Mock d'un serveur Discord pour simuler les opérations */
const mockGuild = {
  id: '123456789012345678',
  roles: {
    create: vi.fn().mockResolvedValue(mockRole),
    fetch: vi.fn().mockResolvedValue(mockRole),
  },
} as unknown as Guild;

/* Mock du client Discord connecté */
const mockClient = {
  user: { id: 'bot-user-id' },
  guilds: {
    fetch: vi.fn().mockResolvedValue(mockGuild),
  },
} as unknown as Client;

/* Mock du service DiscordBot pour simuler les interactions */
const mockDiscordBotService = {
  getClient: vi.fn().mockReturnValue(mockClient),
};

describe('CampusBotService', () => {
  let service: CampusBotService;
  let discordBotService: DiscordBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampusBotService,
        {
          provide: DiscordBotService,
          useValue: mockDiscordBotService,
        },
      ],
    }).compile();

    service = module.get<CampusBotService>(CampusBotService);
    discordBotService = module.get<DiscordBotService>(DiscordBotService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    /* Reset des mocks aux valeurs par défaut */
    mockDiscordBotService.getClient.mockReturnValue(mockClient);
    (mockClient.guilds.fetch as any).mockResolvedValue(mockGuild);
    (mockGuild.roles.create as any).mockResolvedValue(mockRole);
    (mockGuild.roles.fetch as any).mockResolvedValue(mockRole);
    (mockRole.setName as any).mockResolvedValue(undefined);
    (mockRole.delete as any).mockResolvedValue(undefined);
  });

  describe('createCampusRole', () => {
    /* Test de création réussie d'un rôle Discord */
    it('should create a campus role successfully', async () => {
      const guildId = '123456789012345678';
      const campusName = 'Test Campus';

      const result = await service.createCampusRole(guildId, campusName);

      expect(discordBotService.getClient).toHaveBeenCalled();
      expect(mockClient.guilds.fetch).toHaveBeenCalledWith(guildId);
      expect(mockGuild.roles.create).toHaveBeenCalledWith({
        name: 'Campus Test Campus',
        color: '#000000',
        reason: 'Création automatique du rôle pour le campus'
      });
      expect(result).toBe(mockRole);
    });

    /* Test d'erreur quand le bot n'est pas connecté */
    it('should throw BadRequestException when bot is not connected', async () => {
      const disconnectedClient = {
        user: null,
        guilds: {
          fetch: vi.fn(),
        },
      } as unknown as Client;

      mockDiscordBotService.getClient.mockReturnValue(disconnectedClient);

      await expect(service.createCampusRole('guildId', 'campusName'))
        .rejects
        .toThrow(BadRequestException);
    });

    /* Test d'erreur quand le serveur Discord n'existe pas */
    it('should throw BadRequestException when guild is not found', async () => {
      (mockClient.guilds.fetch as any).mockResolvedValue(null);

      await expect(service.createCampusRole('invalid-guild-id', 'campusName'))
        .rejects
        .toThrow(BadRequestException);
    });

    /* Test d'erreur quand la création du rôle échoue */
    it('should throw BadRequestException when role creation fails', async () => {
      (mockGuild.roles.create as any).mockRejectedValue(new Error('Discord API error'));

      await expect(service.createCampusRole('guildId', 'campusName'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('updateCampusRole', () => {
    /* Test de mise à jour réussie d'un rôle Discord */
    it('should update a campus role successfully', async () => {
      const guildId = '123456789012345678';
      const roleId = 'role-id';
      const newName = 'Updated Campus';

      await service.updateCampusRole(guildId, roleId, newName);

      expect(discordBotService.getClient).toHaveBeenCalled();
      expect(mockClient.guilds.fetch).toHaveBeenCalledWith(guildId);
      expect(mockGuild.roles.fetch).toHaveBeenCalledWith(roleId);
      expect(mockRole.setName).toHaveBeenCalledWith('Campus Updated Campus', 'Mise à jour du nom du campus');
    });

    /* Test d'erreur quand le bot n'est pas connecté */
    it('should throw BadRequestException when bot is not connected', async () => {
      const disconnectedClient = {
        user: null,
        guilds: {
          fetch: vi.fn(),
        },
      } as unknown as Client;

      mockDiscordBotService.getClient.mockReturnValue(disconnectedClient);

      await expect(service.updateCampusRole('guildId', 'roleId', 'newName'))
        .rejects
        .toThrow(BadRequestException);
    });

    /* Test d'erreur quand le serveur Discord n'existe pas */
    it('should throw BadRequestException when guild is not found', async () => {
      (mockClient.guilds.fetch as any).mockResolvedValue(null);

      await expect(service.updateCampusRole('invalid-guild-id', 'roleId', 'newName'))
        .rejects
        .toThrow(BadRequestException);
    });

    /* Test quand le rôle n'existe pas (pas d'erreur, juste pas d'action) */
    it('should handle when role is not found', async () => {
      (mockGuild.roles.fetch as any).mockResolvedValue(null);

      await service.updateCampusRole('guildId', 'invalid-role-id', 'newName');

      expect(mockRole.setName).not.toHaveBeenCalled();
    });

    /* Test d'erreur quand la mise à jour du rôle échoue */
    it('should throw BadRequestException when role update fails', async () => {
      (mockRole.setName as any).mockRejectedValue(new Error('Discord API error'));

      await expect(service.updateCampusRole('guildId', 'roleId', 'newName'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('deleteCampusRole', () => {
    /* Test de suppression réussie d'un rôle Discord */
    it('should delete a campus role successfully', async () => {
      const guildId = '123456789012345678';
      const roleId = 'role-id';

      await service.deleteCampusRole(guildId, roleId);

      expect(discordBotService.getClient).toHaveBeenCalled();
      expect(mockClient.guilds.fetch).toHaveBeenCalledWith(guildId);
      expect(mockGuild.roles.fetch).toHaveBeenCalledWith(roleId);
      expect(mockRole.delete).toHaveBeenCalledWith('Suppression du campus');
    });

    /* Test d'erreur quand le bot n'est pas connecté */
    it('should throw BadRequestException when bot is not connected', async () => {
      const disconnectedClient = {
        user: null,
        guilds: {
          fetch: vi.fn(),
        },
      } as unknown as Client;

      mockDiscordBotService.getClient.mockReturnValue(disconnectedClient);

      await expect(service.deleteCampusRole('guildId', 'roleId'))
        .rejects
        .toThrow(BadRequestException);
    });

    /* Test d'erreur quand le serveur Discord n'existe pas */
    it('should throw BadRequestException when guild is not found', async () => {
      (mockClient.guilds.fetch as any).mockResolvedValue(null);

      await expect(service.deleteCampusRole('invalid-guild-id', 'roleId'))
        .rejects
        .toThrow(BadRequestException);
    });

    /* Test quand le rôle n'existe pas (pas d'erreur, juste pas d'action) */
    it('should handle when role is not found', async () => {
      (mockGuild.roles.fetch as any).mockResolvedValue(null);

      await service.deleteCampusRole('guildId', 'invalid-role-id');

      expect(mockRole.delete).not.toHaveBeenCalled();
    });

    /* Test d'erreur quand la suppression du rôle échoue */
    it('should throw BadRequestException when role deletion fails', async () => {
      (mockRole.delete as any).mockRejectedValue(new Error('Discord API error'));

      await expect(service.deleteCampusRole('guildId', 'roleId'))
        .rejects
        .toThrow(BadRequestException);
    });
  });
}); 