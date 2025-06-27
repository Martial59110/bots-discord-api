import { Test, TestingModule } from '@nestjs/testing';
import { SignatureService } from './signature.service';
import { PromotionsService } from '../promotions/promotions.service';
import { MembersService } from '../members/members.service';
import { RolesService } from '../roles/roles.service';
import { GuildsService } from '../guilds/guilds.service';
import { ChannelsService } from '../channels/channels.service';
import { DiscordUsersService } from '../discord-users/discord-users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Member } from '../members/entities/member.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Role } from '../roles/entities/role.entity';
import { Category } from '../categories/entities/category.entity';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SignatureService', () => {
  let service: SignatureService;
  
  // Mocks pour tous les services injectés
  const mockPromotionsService = {
    findOne: vi.fn()
  };
  
  const mockMembersService = {
    findByPromotion: vi.fn()
  };
  
  const mockRolesService = {
    findByPromotion: vi.fn()
  };
  
  const mockGuildsService = {
    findOne: vi.fn()
  };
  
  const mockChannelsService = {
    findChannelByPromotion: vi.fn()
  };

  const mockDiscordUsersService = {
    findOne: vi.fn()
  };

  // Mocks pour tous les repositories
  const mockPromotionRepository = {
    find: vi.fn(),
    findOne: vi.fn()
  };

  const mockMemberRepository = {
    find: vi.fn(),
    findOne: vi.fn()
  };

  const mockChannelRepository = {
    find: vi.fn(),
    findOne: vi.fn()
  };

  const mockRoleRepository = {
    find: vi.fn(),
    findOne: vi.fn()
  };

  const mockCategoryRepository = {
    find: vi.fn(),
    findOne: vi.fn()
  };

  const mockDiscordUserRepository = {
    find: vi.fn(),
    findOne: vi.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureService,
        { provide: PromotionsService, useValue: mockPromotionsService },
        { provide: MembersService, useValue: mockMembersService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: ChannelsService, useValue: mockChannelsService },
        { provide: DiscordUsersService, useValue: mockDiscordUsersService },
        { provide: getRepositoryToken(Promotion), useValue: mockPromotionRepository },
        { provide: getRepositoryToken(Member), useValue: mockMemberRepository },
        { provide: getRepositoryToken(Channel), useValue: mockChannelRepository },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepository },
        { provide: getRepositoryToken(DiscordUser), useValue: mockDiscordUserRepository }
      ],
    }).compile();

    service = module.get<SignatureService>(SignatureService);
    
    // Réinitialiser les mocks avant chaque test
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPromotions', () => {
    it('should return all promotion signatures with the correct structure', async () => {
      // Configurer le mock pour retourner des données de test
      const mockPromotions = [
        {
          uuid_promotion: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Test Promotion',
          category: { uuid: '123456789012345678', name: 'Test Category' },
          followers: [],
          managers: [],
          role: { uuidRole: '234567890123456789' }
        }
      ];
      
      mockPromotionRepository.find.mockResolvedValue(mockPromotions);
      
      const result = await service.getAllPromotions();
      
      // Vérifier que la réponse contient une propriété promotions
      expect(result).toHaveProperty('promotions');
      expect(Array.isArray(result.promotions)).toBe(true);
      expect(result.promotions.length).toBeGreaterThanOrEqual(1);
      
      // Vérifier que toutes les promotions ont la structure correcte
      for (const promotion of result.promotions) {
        expect(promotion).toHaveProperty('uuid');
        expect(promotion).toHaveProperty('nom');
        expect(promotion).toHaveProperty('channel');
        expect(promotion).toHaveProperty('chargeDeProjet');
        expect(promotion).toHaveProperty('formateurs');
        expect(promotion).toHaveProperty('apprenants');
        
        // Vérifier la structure du channel
        expect(promotion.channel).toHaveProperty('snowflake');
        expect(promotion.channel).toHaveProperty('nom');
        
        // Vérifier le chargé de projet
        expect(promotion.chargeDeProjet).toHaveProperty('roles');
        expect(Array.isArray(promotion.chargeDeProjet.roles)).toBe(true);
        
        // Vérifier les formateurs et apprenants
        expect(Array.isArray(promotion.formateurs)).toBe(true);
        expect(Array.isArray(promotion.apprenants)).toBe(true);
      }
    });
  });

  describe('getPromotionSignature', () => {
    it('should return promotion signature for valid UUID', async () => {
      const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      
      // Configurer le mock pour retourner une promotion de test
      const mockPromotion = {
        uuid_promotion: uuid,
        name: 'Test Promotion',
        category: { uuid: '123456789012345678', name: 'Test Category' },
        followers: [],
        managers: [],
        role: { uuidRole: '234567890123456789' }
      };
      
      mockPromotionRepository.findOne.mockResolvedValue(mockPromotion);
      
      const result = await service.getPromotionSignature(uuid);
      
      expect(result).toHaveProperty('uuid');
      expect(result.uuid).toBe(uuid);
      expect(result).toHaveProperty('nom');
      expect(result).toHaveProperty('channel');
      expect(result.channel).toHaveProperty('snowflake');
    });

    it('should throw an error for invalid UUID', async () => {
      const uuid = 'invalid-uuid';
      
      // Configurer le mock pour retourner null (promotion non trouvée)
      mockPromotionRepository.findOne.mockResolvedValue(null);
      
      await expect(service.getPromotionSignature(uuid)).rejects.toThrow();
    });
  });
}); 