import { Test } from '@nestjs/testing';
import { SignatureModule } from './signature.module';
import { SignatureService } from './signature.service';
import { SignatureController } from './signature.controller';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromotionsModule } from '../promotions/promotions.module';
import { MembersModule } from '../members/members.module';
import { RolesModule } from '../roles/roles.module';
import { GuildsModule } from '../guilds/guilds.module';
import { ChannelsModule } from '../channels/channels.module';
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

describe('SignatureModule', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    vi.clearAllMocks();
  });

  it('should compile the module', async () => {
    // Créer des mocks pour tous les services nécessaires
    const mockPromotionsService = { findOne: vi.fn() };
    const mockMembersService = { findByPromotion: vi.fn() };
    const mockRolesService = { findByPromotion: vi.fn() };
    const mockGuildsService = { findOne: vi.fn() };
    const mockChannelsService = { findChannelByPromotion: vi.fn() };
    const mockDiscordUsersService = { findOne: vi.fn() };

    // Mocks pour tous les repositories
    const mockPromotionRepository = { find: vi.fn(), findOne: vi.fn() };
    const mockMemberRepository = { find: vi.fn(), findOne: vi.fn() };
    const mockChannelRepository = { find: vi.fn(), findOne: vi.fn() };
    const mockRoleRepository = { find: vi.fn(), findOne: vi.fn() };
    const mockCategoryRepository = { find: vi.fn(), findOne: vi.fn() };
    const mockDiscordUserRepository = { find: vi.fn(), findOne: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [SignatureController],
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

    const service = moduleRef.get<SignatureService>(SignatureService);
    expect(service).toBeDefined();
  });

  describe('Module structure', () => {
    it('should provide SignatureService', async () => {
      // Créer des mocks pour tous les services nécessaires
      const mockPromotionsService = { findOne: vi.fn() };
      const mockMembersService = { findByPromotion: vi.fn() };
      const mockRolesService = { findByPromotion: vi.fn() };
      const mockGuildsService = { findOne: vi.fn() };
      const mockChannelsService = { findChannelByPromotion: vi.fn() };
      const mockDiscordUsersService = { findOne: vi.fn() };

      // Mocks pour tous les repositories
      const mockPromotionRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockMemberRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockChannelRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockRoleRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockCategoryRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockDiscordUserRepository = { find: vi.fn(), findOne: vi.fn() };

      const moduleRef = await Test.createTestingModule({
        controllers: [SignatureController],
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

      const service = moduleRef.get<SignatureService>(SignatureService);
      expect(service).toBeDefined();
    });

    it('should register the controller', async () => {
      // Créer des mocks pour tous les services nécessaires
      const mockPromotionsService = { findOne: vi.fn() };
      const mockMembersService = { findByPromotion: vi.fn() };
      const mockRolesService = { findByPromotion: vi.fn() };
      const mockGuildsService = { findOne: vi.fn() };
      const mockChannelsService = { findChannelByPromotion: vi.fn() };
      const mockDiscordUsersService = { findOne: vi.fn() };

      // Mocks pour tous les repositories
      const mockPromotionRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockMemberRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockChannelRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockRoleRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockCategoryRepository = { find: vi.fn(), findOne: vi.fn() };
      const mockDiscordUserRepository = { find: vi.fn(), findOne: vi.fn() };

      const moduleRef = await Test.createTestingModule({
        controllers: [SignatureController],
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

      const controller = moduleRef.get<SignatureController>(SignatureController);
      expect(controller).toBeDefined();
    });
  });

  describe('Module dependencies', () => {
    it('should import required modules', () => {
      // Test simple pour vérifier que le module peut être importé
      expect(SignatureModule).toBeDefined();
    });
  });
}); 