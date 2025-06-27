import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuildsService } from './guilds.service';
import { Repository } from 'typeorm';
import { Guild } from './entities/guild.entity';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { Formation } from '../formations/entities/formation.entity';
import { Member } from '../members/entities/member.entity';
import { Role } from '../roles/entities/role.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Category } from '../categories/entities/category.entity';
import { Campus } from '../campuses/entities/campus.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { GuildTemplate } from '../guilds-templates/entities/guild-template.entity';
import { PinoLogger } from 'nestjs-pino';
import { DiscordBotService } from '../discord-bot/discord-bot.service';

const mockRepository = {
  create: vi.fn(),
  save: vi.fn(),
  find: vi.fn(),
  findOneBy: vi.fn(),
  findOne: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
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

const mockDiscordBotService = {
  getClient: vi.fn().mockReturnValue({
    user: { id: 'bot-id' },
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        id: '123456789012345678',
        name: 'Test Guild',
        memberCount: 10,
        iconURL: vi.fn().mockReturnValue('icon-url'),
        ownerId: 'owner-id',
        createdAt: new Date(),
        members: {
          fetch: vi.fn().mockResolvedValue({ id: 'bot-id' })
        }
      })
    }
  })
};

describe('GuildsService', () => {
  let service: GuildsService;

  const mockGuild = {
    uuid: '123456789012345678',
    name: 'Test Guild',
    memberCount: '10',
    configuration: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFormation = {
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Formation',
    isCertified: true,
  };

  const mockMember = {
    uuidMember: '123e4567-e89b-12d3-a456-426614174001',
    guildUsername: 'TestUser',
    xp: '100.00',
    level: 1,
  };

  const mockRole = {
    uuidRole: '234567890123456789',
    name: 'Test Role',
    memberCount: 1,
  };

  beforeEach(() => {
    service = new GuildsService(
      mockRepository as unknown as Repository<Guild>,
      mockDiscordBotService as unknown as DiscordBotService,
      mockRepository as unknown as Repository<Formation>,
      mockRepository as unknown as Repository<Member>,
      mockRepository as unknown as Repository<Promotion>,
      mockLogger as unknown as PinoLogger
    );
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new guild', async () => {
      const dto: CreateGuildDto = {
        uuid: '123456789012345678',
        name: 'Test Guild',
        memberCount: '10',
        configuration: {},
      };
      const entity = { 
        ...dto,
        configuration: {
          icon: 'icon-url',
          ownerId: 'owner-id',
          createdAt: expect.any(Date),
        }
      };
      mockRepository.create.mockReturnValue(entity);
      mockRepository.save.mockResolvedValue(entity);

      expect(await service.create(dto)).toEqual(entity);
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        uuid: dto.uuid,
        name: dto.name,
        memberCount: dto.memberCount,
        configuration: expect.objectContaining({
          icon: 'icon-url',
          ownerId: 'owner-id',
          createdAt: expect.any(Date),
        })
      }));
      expect(mockRepository.save).toHaveBeenCalledWith(entity);
    });
  });

  describe('findAll', () => {
    it('should return an array of guilds with relations', async () => {
      const guildWithRelations = {
        ...mockGuild,
        formations: [mockFormation],
        members: [mockMember],
        roles: [mockRole],
      };
      mockRepository.find.mockResolvedValue([guildWithRelations]);
      mockRepository.count.mockResolvedValue(10);
      
      const result = await service.findAll();
      
      expect(result).toEqual([guildWithRelations]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        select: ['uuid', 'name', 'memberCount', 'configuration', 'createdAt', 'updatedAt']
      });
    });
  });

  describe('findOne', () => {
    it('should return a single guild with relations', async () => {
      const guildWithRelations = {
        ...mockGuild,
        formations: [mockFormation],
        members: [mockMember],
        roles: [mockRole],
      };
      mockRepository.findOne.mockResolvedValue(guildWithRelations);

      const result = await service.findOne('123456789012345678');

      expect(result).toEqual(guildWithRelations);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { uuid: '123456789012345678' },
        relations: ['formations', 'members', 'roles', 'channels', 'categories', 'campuses', 'promotions', 'template']
      });
    });
  });

  describe('update', () => {
    it('should update a guild and maintain relations', async () => {
      const dto: UpdateGuildDto = {
        name: 'Updated Guild',
        memberCount: '15',
        configuration: { setting: true },
      };
      const existingGuild = {
        ...mockGuild,
        formations: [mockFormation],
        members: [mockMember],
        roles: [mockRole],
      };
      const updatedGuild = { ...existingGuild, ...dto };

      mockRepository.findOne.mockResolvedValue(existingGuild);
      mockRepository.save.mockResolvedValue(updatedGuild);

      const result = await service.update('123456789012345678', dto);

      expect(result).toEqual(updatedGuild);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { uuid: '123456789012345678' },
        relations: ['formations', 'members', 'roles', 'channels', 'categories', 'campuses', 'promotions', 'template']
      });
      expect(mockRepository.save).toHaveBeenCalledWith(updatedGuild);
    });
  });

  describe('remove', () => {
    it('should delete a guild and cascade delete related entities', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });
      await service.remove('123456789012345678');
      expect(mockRepository.delete).toHaveBeenCalledWith({ uuid: '123456789012345678' });
    });
  });
});
