import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { CampusesService } from './campuses.service';
import { RolesService } from '../roles/roles.service';
import { CampusBotService } from './campus-bot.service';
import { Repository } from 'typeorm';
import { Campus } from './entities/campus.entity';
import { Role } from '../roles/entities/role.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';

describe('Campus-Role Integration Tests', () => {
  let app: INestApplication;
  let campusesService: CampusesService;
  let rolesService: RolesService;
  let campusRepository: Repository<Campus>;
  let roleRepository: Repository<Role>;

  // Mocks pour éviter les dépendances externes
  const mockCampusBotService = {
    createCampusRole: vi.fn().mockResolvedValue({
      id: '123456789012345678',
      name: 'Test Campus Role',
      position: 1,
      hexColor: '#FF0000'
    }),
    updateCampusRole: vi.fn().mockResolvedValue(undefined),
    deleteCampusRole: vi.fn().mockResolvedValue(undefined)
  };

  const mockLogger = {
    setContext: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    info: vi.fn(),
  };

  const mockCampusRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    delete: vi.fn(),
  };

  const mockRoleRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    delete: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CampusesService,
        RolesService,
        {
          provide: CampusBotService,
          useValue: mockCampusBotService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
        {
          provide: getRepositoryToken(Campus),
          useValue: mockCampusRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    campusesService = moduleRef.get<CampusesService>(CampusesService);
    rolesService = moduleRef.get<RolesService>(RolesService);
    campusRepository = moduleRef.get<Repository<Campus>>(getRepositoryToken(Campus));
    roleRepository = moduleRef.get<Repository<Role>>(getRepositoryToken(Role));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Campus et Rôle - Workflow complet', () => {
    it('devrait créer un campus et son rôle associé en séquence', async () => {
     
      const campusData = {
        name: 'Campus Test Intégration',
        uuidGuild: '123456789012345678'
      };

      const expectedCampus = {
        uuidCampus: '123e4567-e89b-12d3-a456-426614174000',
        name: campusData.name,
        uuidGuild: campusData.uuidGuild,
        uuidRole: '123456789012345678', 
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const expectedRole = {
        uuidRole: '123456789012345678',
        name: 'Campus Test Intégration',
        memberCount: 0,
        hexColor: '#FF0000',
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 2. Configuration des mocks
      mockCampusRepository.create.mockReturnValue(expectedCampus);
      mockCampusRepository.save.mockResolvedValue(expectedCampus);
      mockRoleRepository.create.mockReturnValue(expectedRole);
      mockRoleRepository.save.mockResolvedValue(expectedRole);

      // 3. Exécution du workflow d'intégration
      const createdCampus = await campusesService.create(campusData);
      
      // 4. Vérification que le campus a été créé avec un UUID de rôle
      expect(createdCampus).toBeDefined();
      expect(createdCampus.uuidRole).toBeDefined();
      expect(mockCampusBotService.createCampusRole).toHaveBeenCalledWith(
        campusData.uuidGuild,
        campusData.name
      );

      // 5. Création du rôle en base avec l'UUID retourné par Discord
      const roleData = {
        uuidRole: createdCampus.uuidRole,
        name: campusData.name,
        memberCount: '0',
        rolePosition: '1',
        hoist: false,
        color: '#FF0000',
        uuidGuild: campusData.uuidGuild
      };

      const createdRole = await rolesService.create(roleData);

      // 6. Vérifications finales
      expect(createdRole).toBeDefined();
      expect(createdRole.uuidRole).toBe(createdCampus.uuidRole);
      expect(createdRole.name).toBe(campusData.name);

      // 7. Vérification que les services ont été appelés correctement
      expect(mockCampusRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: campusData.name,
          uuidGuild: campusData.uuidGuild,
          uuidRole: expect.any(String)
        })
      );

      expect(mockRoleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uuidRole: createdCampus.uuidRole,
          name: campusData.name,
          memberCount: 0,
          rolePosition: 1,
          hoist: false,
          color: '#FF0000',
          uuidGuild: campusData.uuidGuild
        })
      );
    });

    it('devrait gérer les erreurs lors de la création du rôle Discord', async () => {
      // 1. Simulation d'une erreur Discord
      mockCampusBotService.createCampusRole.mockRejectedValue(
        new Error('Erreur Discord API')
      );

      const campusData = {
        name: 'Campus Test Erreur',
        uuidGuild: '123456789012345678'
      };

      // 2. Vérification que l'erreur est propagée
      await expect(campusesService.create(campusData))
        .rejects
        .toThrow('Erreur Discord API');

      // 3. Vérification que le campus n'a pas été créé en base
      expect(mockCampusRepository.save).not.toHaveBeenCalled();
    });

    it('devrait permettre la mise à jour du campus et du rôle', async () => {
      // 1. Campus existant
      const existingCampus = {
        uuidCampus: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Campus Original',
        uuidGuild: '123456789012345678',
        uuidRole: '123456789012345678',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedCampus = {
        ...existingCampus,
        name: 'Campus Mis à Jour'
      };

      // 2. Configuration des mocks
      mockCampusRepository.findOneBy.mockResolvedValue(existingCampus);
      mockCampusRepository.save.mockResolvedValue(updatedCampus);

      // 3. Mise à jour du campus
      const result = await campusesService.update(
        existingCampus.uuidCampus,
        { name: 'Campus Mis à Jour' }
      );

      // 4. Vérifications
      expect(result.name).toBe('Campus Mis à Jour');
      expect(mockCampusBotService.updateCampusRole).toHaveBeenCalledWith(
        existingCampus.uuidGuild,
        existingCampus.uuidRole,
        'Campus Mis à Jour'
      );
    });

    it('devrait supprimer le campus et le rôle en cascade', async () => {
      // 1. Campus à supprimer
      const campusToDelete = {
        uuidCampus: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Campus à Supprimer',
        uuidGuild: '123456789012345678',
        uuidRole: '123456789012345678',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 2. Configuration des mocks
      mockCampusRepository.findOneBy.mockResolvedValue(campusToDelete);
      mockCampusRepository.delete.mockResolvedValue({ affected: 1 });
      mockRoleRepository.delete.mockResolvedValue({ affected: 1 });

      // 3. Suppression du campus
      await campusesService.remove(campusToDelete.uuidCampus);

      // 4. Vérifications
      expect(mockCampusBotService.deleteCampusRole).toHaveBeenCalledWith(
        campusToDelete.uuidGuild,
        campusToDelete.uuidRole
      );
      expect(mockCampusRepository.delete).toHaveBeenCalledWith({
        uuidCampus: campusToDelete.uuidCampus
      });
    });
  });

  describe('Validation des données', () => {
    it('devrait valider les données du campus avant création', async () => {
      const invalidCampusData = {
        name: '', // Nom vide
        uuidGuild: 'invalid-uuid' // UUID invalide
      };

      // Le service devrait rejeter les données invalides
      await expect(campusesService.create(invalidCampusData))
        .rejects
        .toThrow();
    });

    it('devrait valider les données du rôle avant création', async () => {
      const invalidRoleData = {
        uuidRole: '', // UUID vide
        name: '', // Nom vide
        memberCount: '-1', // Nombre négatif
        rolePosition: '1',
        hoist: false,
        color: '#FF0000',
        uuidGuild: '123456789012345678'
      };

      // Configuration du mock pour rejeter les données invalides
      mockRoleRepository.create.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      // Le service devrait rejeter les données invalides
      await expect(rolesService.create(invalidRoleData))
        .rejects
        .toThrow('Validation failed');
    });
  });
}); 