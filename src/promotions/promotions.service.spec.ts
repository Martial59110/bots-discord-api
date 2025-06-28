import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { Role } from '../roles/entities/role.entity';
import { Member } from '../members/entities/member.entity';
import { Category } from '../categories/entities/category.entity';
import { FormationsService } from '../formations/formations.service';
import { PromotionsBotService } from './promotions-bot.service';
import { MembersService } from '../members/members.service';
import { PinoLogger } from 'nestjs-pino';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Repository } from 'typeorm';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let promotionRepository: Repository<Promotion>;
  let roleRepository: Repository<Role>;
  let memberRepository: Repository<Member>;

  const mockPromotionRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    remove: vi.fn(),
    count: vi.fn().mockResolvedValue(2),
    createQueryBuilder: vi.fn(() => ({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
      getOne: vi.fn().mockResolvedValue(null),
      innerJoin: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(0),
      relation: vi.fn(() => ({
        of: vi.fn(() => ({
          add: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    })),
  };

  const mockRoleRepository = {
    create: vi.fn(),
    save: vi.fn(),
    findOneBy: vi.fn(),
  };

  const mockMemberRepository = {
    findOneBy: vi.fn(),
  };

  const mockCategoryRepository = {
    findOneBy: vi.fn(),
    save: vi.fn(),
  };

  const mockFormationsService = {
    findOne: vi.fn(),
  };

  const mockMembersService = {
    findOne: vi.fn(),
    findOneBy: vi.fn(),
  };

  const mockDiscordRole = {
    id: '234567890123456789',
    position: 0,
    hexColor: '#000000',
  };

  const mockPromotionsBotService = {
    createPromotionRole: vi.fn().mockResolvedValue(mockDiscordRole),
    createPromotionCategory: vi.fn().mockResolvedValue({ id: 'cat123', name: 'Catégorie', position: 1 }),
    createPromotionChannels: vi.fn().mockResolvedValue({ createdForums: {} }),
    createPromotionThreads: vi.fn(),
    updatePromotionRole: vi.fn(),
    updateCategoryPosition: vi.fn(),
  };

  const mockPinoLogger = {
    setContext: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        {
          provide: getRepositoryToken(Promotion),
          useValue: mockPromotionRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: mockMemberRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: FormationsService,
          useValue: mockFormationsService,
        },
        {
          provide: PromotionsBotService,
          useValue: mockPromotionsBotService,
        },
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    promotionRepository = module.get<Repository<Promotion>>(getRepositoryToken(Promotion));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    memberRepository = module.get<Repository<Member>>(getRepositoryToken(Member));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new promotion with associated role', async () => {
      const createPromotionDto: CreatePromotionDto = {
        name: 'Test Promotion',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        status: 'active',
        uuidCourse: '123e4567-e89b-12d3-a456-426614174000',
        uuidFormation: '123e4567-e89b-12d3-a456-426614174001',
        uuidCampus: '123e4567-e89b-12d3-a456-426614174002',
        uuidGuild: '123456789012345678',
        uuidRole: '234567890123456789',
      };

      const newRole = {
        id: 1,
        uuidRole: '234567890123456789',
        uuidGuild: '123456789012345678',
        name: 'Test Promotion',
        memberCount: 0,
        rolePosition: 0,
        hoist: false,
        color: "#000000",
      };

      const savedPromotion = {
        id: 1,
        uuid_promotion: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Promotion',
        startDate: new Date(createPromotionDto.startDate),
        endDate: new Date(createPromotionDto.endDate),
        status: 'active',
        uuidCourse: '123e4567-e89b-12d3-a456-426614174000',
        uuidFormation: '123e4567-e89b-12d3-a456-426614174001',
        uuidCampus: '123e4567-e89b-12d3-a456-426614174002',
        uuidGuild: '123456789012345678',
        uuidRole: '234567890123456789',
        uuidCategory: 'cat123',
        createdAt: new Date(),
        updatedAt: new Date(),
        followers: [],
        managers: [],
        category: { position: 1 },
        guild: { name: 'Test Guild' },
      };

      mockRoleRepository.create.mockReturnValue(newRole);
      mockRoleRepository.save.mockResolvedValue(newRole);
      mockPromotionRepository.create.mockReturnValue(savedPromotion);
      mockPromotionRepository.save.mockResolvedValue(savedPromotion);
      mockFormationsService.findOne.mockResolvedValue({ channels: [], threads: [] });

      const result = await service.create(createPromotionDto);

      expect(mockRoleRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        uuidRole: createPromotionDto.uuidRole,
        uuidGuild: createPromotionDto.uuidGuild,
        name: createPromotionDto.name,
      }));
      expect(mockRoleRepository.save).toHaveBeenCalledWith(newRole);
      expect(mockPromotionRepository.create).toHaveBeenCalled();
      expect(mockPromotionRepository.save).toHaveBeenCalled();
      expect(result).toEqual(savedPromotion);
    });
  });

  describe('findAll', () => {
    it('should return an array of promotions with relations', async () => {
      const promotions = [
        {
          uuid_promotion: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Promotion 1',
          followers: [{}, {}],
          category: { position: 1 },
          guild: { name: 'Guild 1' },
        },
        {
          uuid_promotion: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Promotion 2',
          followers: [],
          category: { position: null },
          guild: undefined,
        },
      ];
      mockPromotionRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(promotions),
        getOne: vi.fn().mockResolvedValue(null),
        innerJoin: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(0),
        relation: vi.fn(() => ({
          of: vi.fn(() => ({
            add: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      });

      const result = await service.findAll();

      expect(mockPromotionRepository.createQueryBuilder).toHaveBeenCalledWith('promotion');
      expect(result.data).toEqual([
        {
          ...promotions[0],
          guildName: 'Guild 1',
          memberCount: 2,
          categoryPosition: 1,
        },
        {
          ...promotions[1],
          guildName: undefined,
          memberCount: 0,
          categoryPosition: null,
        },
      ]);
      expect(result.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return a single promotion with relations', async () => {
      const promotion = { uuid_promotion: '123e4567-e89b-12d3-a456-426614174001', name: 'Promotion 1' };
      mockPromotionRepository.findOne.mockResolvedValue(promotion);

      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174001');

      expect(mockPromotionRepository.findOne).toHaveBeenCalledWith({
        where: { uuid_promotion: '123e4567-e89b-12d3-a456-426614174001' },
        relations: ['followers', 'managers', 'category', 'formation', 'guild', 'role', 'campus']
      });
      expect(result).toEqual(promotion);
    });
  });

  describe('update', () => {
    it('should update a promotion', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174001';
      const updatePromotionDto: UpdatePromotionDto = { 
        name: 'Updated Promotion',
        startDate: new Date('2024-02-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
      };
      
      const existingPromotion = { 
        id: 1,
        uuid_promotion: uuid,
        name: 'Old Promotion',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-11-30T00:00:00.000Z'),
        updatedAt: new Date(),
        followers: [],
        managers: [],
        category: { position: 1 },
        guild: { name: 'Test Guild' },
      };
      
      const updatedPromotion = { 
        ...existingPromotion,
        ...updatePromotionDto,
        startDate: new Date(updatePromotionDto.startDate ?? '2024-02-01T00:00:00.000Z'),
        endDate: new Date(updatePromotionDto.endDate ?? '2024-12-31T00:00:00.000Z'),
        updatedAt: expect.any(Date),
      };

      mockPromotionRepository.findOne.mockResolvedValue(existingPromotion);
      mockPromotionRepository.save.mockResolvedValue(updatedPromotion);

      const result = await service.update(uuid, updatePromotionDto);

      expect(mockPromotionRepository.findOne).toHaveBeenCalledWith({
        where: { uuid_promotion: uuid },
        relations: ['followers', 'managers', 'category', 'formation', 'guild', 'role', 'campus']
      });
      expect(mockPromotionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...existingPromotion,
        ...updatePromotionDto,
        startDate: new Date(updatePromotionDto.startDate ?? '2024-02-01T00:00:00.000Z'),
        endDate: new Date(updatePromotionDto.endDate ?? '2024-12-31T00:00:00.000Z'),
        updatedAt: expect.any(Date),
      }));
      expect(result).toEqual(updatedPromotion);
    });
  });

  describe('remove', () => {
    it('should remove a promotion', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174001';
      const promotion = { uuid_promotion: uuid, name: 'Promotion to Remove' };
      
      mockPromotionRepository.findOne.mockResolvedValue(promotion);
      mockPromotionRepository.remove.mockResolvedValue(promotion);

      const result = await service.remove(uuid);

      expect(mockPromotionRepository.findOne).toHaveBeenCalledWith({
        where: { uuid_promotion: uuid },
        relations: ['followers', 'managers', 'category', 'formation', 'guild', 'role', 'campus']
      });
      expect(mockPromotionRepository.remove).toHaveBeenCalledWith(promotion);
      expect(result).toEqual(promotion);
    });
  });

  describe('addFollower', () => {
    it('should add a member as follower to a promotion', async () => {
      const uuidPromotion = '123e4567-e89b-12d3-a456-426614174001';
      const uuidMember = '123e4567-e89b-12d3-a456-426614174002';
      
      const promotion = { 
        uuid_promotion: uuidPromotion, 
        name: 'Test Promotion',
        followers: [],
        category: { position: 1 },
        guild: { name: 'Test Guild' },
      };
      
      const member = { uuidMember, guildUsername: 'TestUser' };
      const updatedPromotion = { 
        ...promotion,
        followers: [],
      };

      mockPromotionRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
        getOne: vi.fn().mockResolvedValue(null),
        innerJoin: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(0),
        relation: vi.fn(() => ({
          of: vi.fn(() => ({
            add: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      });

      mockPromotionRepository.findOne.mockResolvedValue(promotion);
      mockMemberRepository.findOneBy.mockResolvedValue(member);
      mockPromotionRepository.save.mockResolvedValue(updatedPromotion);

      const result = await service.addFollower(uuidPromotion, uuidMember);

      expect(mockPromotionRepository.findOne).toHaveBeenCalledWith({
        where: { uuid_promotion: uuidPromotion },
        relations: ['followers']
      });
      expect(mockMemberRepository.findOneBy).toHaveBeenCalledWith({ uuidMember });
      expect(mockPromotionRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedPromotion);
    });
  });

  describe('addManager', () => {
    it('should add a member as manager to a promotion', async () => {
      const uuidPromotion = '123e4567-e89b-12d3-a456-426614174001';
      const uuidMember = '123e4567-e89b-12d3-a456-426614174002';
      
      const promotion = { 
        uuid_promotion: uuidPromotion, 
        name: 'Test Promotion',
        managers: [],
      };
      
      const member = { uuidMember, guildUsername: 'TestUser' };
      const updatedPromotion = { 
        ...promotion,
        managers: [member],
      };

      mockPromotionRepository.findOne.mockResolvedValue(promotion);
      mockMemberRepository.findOneBy.mockResolvedValue(member);
      mockPromotionRepository.save.mockResolvedValue(updatedPromotion);

      const result = await service.addManager(uuidPromotion, uuidMember);

      expect(mockPromotionRepository.findOne).toHaveBeenCalledWith({
        where: { uuid_promotion: uuidPromotion },
        relations: ['managers']
      });
      expect(mockMemberRepository.findOneBy).toHaveBeenCalledWith({ uuidMember });
      expect(mockPromotionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...promotion,
        managers: [member],
      }));
      expect(result).toEqual(updatedPromotion);
    });
  });
}); 