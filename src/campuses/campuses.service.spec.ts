import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampusesService as CampusesService } from './campuses.service';
import { Repository } from 'typeorm';
import { Campus } from './entities/campus.entity';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { Role } from '../roles/entities/role.entity';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { Client } from 'discord.js';

const mockRoleRepository = {
  create: vi.fn(),
  save: vi.fn(),
};

const mockRepository = {
  create: vi.fn(),
  save: vi.fn(),
  find: vi.fn(),
  findOneBy: vi.fn(),
  delete: vi.fn(),
};

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

describe('CampusesService', () => {
  let service: CampusesService;

  beforeEach(() => {
    service = new CampusesService(
      mockRepository as unknown as Repository<Campus>,
      mockRoleRepository as unknown as Repository<Role>,
      mockDiscordBotService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

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

  it('should return an array of campuses', async () => {
    const result = [{ uuidCampus: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Campus' }];
    mockRepository.find.mockResolvedValue(result);
    expect(await service.findAll()).toEqual(result);
    expect(mockRepository.find).toHaveBeenCalled();
  });

  it('should return a single campus', async () => {
    const result = { uuidCampus: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Campus' };
    mockRepository.findOneBy.mockResolvedValue(result);
    expect(await service.findOne('123e4567-e89b-12d3-a456-426614174000')).toEqual(result);
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ uuidCampus: '123e4567-e89b-12d3-a456-426614174000' });
  });

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

    const mockDiscordClient = {
      user: {},
      guilds: {
        fetch: vi.fn().mockResolvedValue({
          roles: {
            fetch: vi.fn().mockResolvedValue({
              setName: vi.fn().mockResolvedValue(undefined)
            })
          }
        })
      }
    };
    mockDiscordBotService.getClient = () => mockDiscordClient as unknown as Client<boolean>;

    // Exécuter la mise à jour
    const result = await service.update('123e4567-e89b-12d3-a456-426614174000', dto);

    // Vérifier les résultats
    expect(result).toEqual(updatedCampus);
    
    // Vérifier que le campus a été trouvé
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ 
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000' 
    });

    // Vérifier que le rôle Discord a été mis à jour
    expect(mockDiscordClient.guilds.fetch).toHaveBeenCalledWith(existingCampus.uuidGuild);
    const mockGuild = await mockDiscordClient.guilds.fetch();
    expect(mockGuild.roles.fetch).toHaveBeenCalledWith(existingCampus.uuidRole);
    const mockRole = await mockGuild.roles.fetch();
    expect(mockRole.setName).toHaveBeenCalledWith(
      'Campus Updated Campus',
      'Mise à jour du nom du campus'
    );

    // Vérifier que le campus a été mis à jour dans la base de données
    expect(mockRepository.save).toHaveBeenCalledWith(updatedCampus);
  });

  it('should delete a campus', async () => {
    // Simuler un campus existant avec un rôle associé
    const existingCampus = {
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000',
      uuidRole: '234567890123456789',
      uuidGuild: '123456789012345678',
      name: 'Test Campus'
    };

    // Configurer les mocks
    mockRepository.findOneBy.mockResolvedValue(existingCampus);
    mockRepository.delete.mockResolvedValue({ affected: 1 });

    // Simuler le client Discord et ses méthodes
    const mockDiscordClient = {
      user: {},
      guilds: {
        fetch: vi.fn().mockResolvedValue({
          roles: {
            fetch: vi.fn().mockResolvedValue({
              delete: vi.fn().mockResolvedValue(undefined)
            })
          }
        })
      }
    };
    mockDiscordBotService.getClient = () => mockDiscordClient as unknown as Client<boolean>;

    // Exécuter la suppression
    const result = await service.remove('123e4567-e89b-12d3-a456-426614174000');

    // Vérifier les résultats
    expect(result).toEqual({ affected: 1 });
    
    // Vérifier que le campus a été trouvé
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ 
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000' 
    });

    // Vérifier que le rôle Discord a été supprimé
    expect(mockDiscordClient.guilds.fetch).toHaveBeenCalledWith(existingCampus.uuidGuild);
    const mockGuild = await mockDiscordClient.guilds.fetch();
    expect(mockGuild.roles.fetch).toHaveBeenCalledWith(existingCampus.uuidRole);
    const mockRole = await mockGuild.roles.fetch();
    expect(mockRole.delete).toHaveBeenCalledWith('Suppression du campus');

    // Vérifier que le campus a été supprimé de la base de données
    expect(mockRepository.delete).toHaveBeenCalledWith({ 
      uuidCampus: '123e4567-e89b-12d3-a456-426614174000' 
    });
  });
});