/* 
 * Tests d'intégration pour le workflow Campus-Rôle
 * 
 * Ces tests vérifient que l'intégration entre les services fonctionne correctement :
 * - Création d'un campus avec création automatique du rôle Discord
 * - Mise à jour synchronisée entre campus et rôle
 * - Suppression en cascade
 * - Gestion des erreurs d'intégration
 * 
 * On teste le workflow complet, pas juste les unités isolées
 */
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

  /* Mock du service CampusBot pour simuler les interactions Discord */
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

  /* Mock du logger pour éviter les logs pendant les tests */
  const mockLogger = {
    setContext: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    info: vi.fn(),
  };

  /* Mock du repository des campus pour simuler la base de données */
  const mockCampusRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    delete: vi.fn(),
  };

  /* Mock du repository des rôles pour simuler la base de données */
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
    /* Test du workflow complet de création d'un campus avec son rôle */
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

      mockCampusRepository.create.mockReturnValue(expectedCampus);
      mockCampusRepository.save.mockResolvedValue(expectedCampus);
      mockRoleRepository.create.mockReturnValue(expectedRole);
      mockRoleRepository.save.mockResolvedValue(expectedRole);

      const createdCampus = await campusesService.create(campusData);
      
      expect(createdCampus).toBeDefined();
      expect(createdCampus.uuidRole).toBeDefined();
      expect(mockCampusBotService.createCampusRole).toHaveBeenCalledWith(
        campusData.uuidGuild,
        campusData.name
      );

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

      expect(createdRole).toBeDefined();
      expect(createdRole.uuidRole).toBe(createdCampus.uuidRole);
      expect(createdRole.name).toBe(campusData.name);

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

    /* Test de gestion d'erreur quand Discord échoue */
    it('devrait gérer les erreurs lors de la création du rôle Discord', async () => {
      mockCampusBotService.createCampusRole.mockRejectedValue(
        new Error('Erreur Discord API')
      );

      const campusData = {
        name: 'Campus Test Erreur',
        uuidGuild: '123456789012345678'
      };

      await expect(campusesService.create(campusData))
        .rejects
        .toThrow('Erreur Discord API');

      expect(mockCampusRepository.save).not.toHaveBeenCalled();
    });

    /* Test de mise à jour synchronisée entre campus et rôle Discord */
    it('devrait permettre la mise à jour du campus et du rôle', async () => {
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

      mockCampusRepository.findOneBy.mockResolvedValue(existingCampus);
      mockCampusRepository.save.mockResolvedValue(updatedCampus);

      const result = await campusesService.update(
        existingCampus.uuidCampus,
        { name: 'Campus Mis à Jour' }
      );

      expect(result.name).toBe('Campus Mis à Jour');
      expect(mockCampusBotService.updateCampusRole).toHaveBeenCalledWith(
        existingCampus.uuidGuild,
        existingCampus.uuidRole,
        'Campus Mis à Jour'
      );
    });

    /* Test de suppression en cascade avec nettoyage Discord */
    it('devrait supprimer le campus et le rôle en cascade', async () => {
      const campusToDelete = {
        uuidCampus: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Campus à Supprimer',
        uuidGuild: '123456789012345678',
        uuidRole: '123456789012345678',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCampusRepository.findOneBy.mockResolvedValue(campusToDelete);
      mockCampusRepository.delete.mockResolvedValue({ affected: 1 });
      mockRoleRepository.delete.mockResolvedValue({ affected: 1 });

      await campusesService.remove(campusToDelete.uuidCampus);

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
    /* Test de validation des données du campus */
    it('devrait valider les données du campus avant création', async () => {
      const invalidCampusData = {
        name: '', /* Nom vide */
        uuidGuild: 'invalid-uuid' /* UUID invalide */
      };

      await expect(campusesService.create(invalidCampusData))
        .rejects
        .toThrow();
    });

    /* Test de validation des données du rôle */
    it('devrait valider les données du rôle avant création', async () => {
      const invalidRoleData = {
        uuidRole: '', /* UUID vide */
        name: '', /* Nom vide */
        memberCount: '-1', /* Nombre négatif */
        rolePosition: '1',
        hoist: false,
        color: '#FF0000',
        uuidGuild: '123456789012345678'
      };

      mockRoleRepository.create.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      await expect(rolesService.create(invalidRoleData))
        .rejects
        .toThrow('Validation failed');
    });
  });
}); 