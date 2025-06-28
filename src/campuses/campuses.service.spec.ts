/* 
 * Tests pour le service CampusesService
 * 
 * Ces tests vérifient que le service gère correctement les campus :
 * - Création avec synchronisation Discord
 * - Lecture des campus
 * - Mise à jour avec mise à jour du rôle Discord
 * - Suppression avec nettoyage Discord
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampusesService as CampusesService } from './campuses.service';
import { Repository } from 'typeorm';
import { Campus } from './entities/campus.entity';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { Role } from '../roles/entities/role.entity';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { Client } from 'discord.js';

/* Mock du repository des rôles pour simuler la base de données */
const mockRoleRepository = {
  create: vi.fn(),
  save: vi.fn(),
};

/* Mock du repository des campus pour simuler la base de données */
const mockRepository = {
  create: vi.fn(),
  save: vi.fn(),
  find: vi.fn(),
  findOneBy: vi.fn(),
  delete: vi.fn(),
};

/* Mock du service Discord Bot pour simuler les interactions Discord */
const mockDiscordBotService = {
  getClient: () => ({
    user: {},
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        roles: {
          create: vi.fn().mockResolvedValue({
            id: '234567890123456789',
            position: 0,
            hexColor: '#000000'
          })
        }
      })
    }
  } as unknown as Client<boolean>)
} as unknown as DiscordBotService;

/* Mock du service CampusBot pour simuler les opérations Discord */
const mockCampusBotService = {
  createCampusRole: vi.fn().mockResolvedValue({
    id: '234567890123456789',
    position: 0,
    hexColor: '#000000'
  }),
  updateCampusRole: vi.fn().mockResolvedValue(undefined),
  deleteCampusRole: vi.fn().mockResolvedValue(undefined)
};

describe('CampusesService', () => {
  let service: CampusesService;

  beforeEach(() => {
    service = new CampusesService(
      mockRepository as unknown as Repository<Campus>,
      mockRoleRepository as unknown as Repository<Role>,
      mockCampusBotService as any
    );
  });

  /* Vérifie que le service est bien instancié */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* Test de création d'un campus avec création automatique du rôle Discord */
  it('should create a new campus', async () => {
    const dto: CreateCampusDto = { 
      name: 'Test Campus',
      uuidGuild: '123456789012345678',
      uuidRole: '234567890123456789'
    };
    
    const mockRole = {
      uuidRole: '234567890123456789',
      uuidGuild: '123456789012345678',
      name: 'Test Campus',
      memberCount: 0,
      rolePosition: 0,
      hoist: false,
      color: "#000000",
    };
    
    const entity = { 
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000', 
      ...dto 
    };
    
    mockRoleRepository.create.mockReturnValue(mockRole);
    mockRoleRepository.save.mockResolvedValue(mockRole);
    mockRepository.create.mockReturnValue(entity);
    mockRepository.save.mockResolvedValue(entity);

    const result = await service.create(dto);
    expect(result).toEqual(entity);
    expect(mockRoleRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      uuidRole: dto.uuidRole,
      uuidGuild: dto.uuidGuild,
      name: dto.name
    }));
    expect(mockRoleRepository.save).toHaveBeenCalledWith(mockRole);
    expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      ...dto,
      uuidRole: mockRole.uuidRole
    }));
    expect(mockRepository.save).toHaveBeenCalledWith(entity);
  });

  /* Test de récupération de tous les campus */
  it('should return an array of campuses', async () => {
    const result = [{ uuidCampus: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Campus' }];
    mockRepository.find.mockResolvedValue(result);
    expect(await service.findAll()).toEqual(result);
    expect(mockRepository.find).toHaveBeenCalled();
  });

  /* Test de récupération d'un campus spécifique */
  it('should return a single campus', async () => {
    const result = { uuidCampus: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Campus' };
    mockRepository.findOneBy.mockResolvedValue(result);
    expect(await service.findOne('123e4567-e89b-12d3-a456-426614174000')).toEqual(result);
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ uuidCampus: '123e4567-e89b-12d3-a456-426614174000' });
  });

  /* Test de mise à jour d'un campus avec mise à jour du rôle Discord */
  it('should update a campus', async () => {
    const existingCampus = {
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000',
      uuidRole: '234567890123456789',
      uuidGuild: '123456789012345678',
      name: 'Test Campus'
    };

    const dto: UpdateCampusDto = { name: 'Updated Campus' };
    const updatedCampus = { ...existingCampus, name: 'Updated Campus' };

    mockRepository.findOneBy.mockResolvedValue(existingCampus);
    mockRepository.save.mockResolvedValue(updatedCampus);

    const result = await service.update('123e4567-e89b-12d3-a456-426614174000', dto);

    expect(result).toEqual(updatedCampus);
    
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ 
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000' 
    });

    expect(mockCampusBotService.updateCampusRole).toHaveBeenCalledWith(
      existingCampus.uuidGuild,
      existingCampus.uuidRole,
      'Updated Campus'
    );

    expect(mockRepository.save).toHaveBeenCalledWith(updatedCampus);
  });

  /* Test de suppression d'un campus avec suppression du rôle Discord */
  it('should delete a campus', async () => {
    const existingCampus = {
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000',
      uuidRole: '234567890123456789',
      uuidGuild: '123456789012345678',
      name: 'Test Campus'
    };

    mockRepository.findOneBy.mockResolvedValue(existingCampus);
    mockRepository.delete.mockResolvedValue({ affected: 1 });

    const result = await service.remove('123e4567-e89b-12d3-a456-426614174000');

    expect(result).toEqual({ affected: 1 });
    
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ 
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000' 
    });

    expect(mockCampusBotService.deleteCampusRole).toHaveBeenCalledWith(
      existingCampus.uuidGuild,
      existingCampus.uuidRole
    );

    expect(mockRepository.delete).toHaveBeenCalledWith({ 
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000' 
    });
  });
});