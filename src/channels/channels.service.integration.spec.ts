import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelsService } from './channels.service';
import { Channel } from './entities/channel.entity';
import { Category } from '../categories/entities/category.entity';
import { Guild } from '../guilds/entities/guild.entity';
import { CategoriesService } from '../categories/categories.service';
import { GuildsService } from '../guilds/guilds.service';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from 'discord.js';
import { Formation } from '../formations/entities/formation.entity';
import { Member } from '../members/entities/member.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Role } from '../roles/entities/role.entity';
import { ConfigModule } from '@nestjs/config';
import { Campus } from '../campuses/entities/campus.entity';

describe('ChannelsService Integration', () => {
  let channelsService: ChannelsService;
  let categoriesService: CategoriesService;
  let guildsService: GuildsService;
  let module: TestingModule;
  let testGuild: Guild;
  let testCategory: Category;

  beforeAll(async () => {
    const mockClient = {
      isReady: () => true,
    } as unknown as Client<boolean>;

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test'
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'example_username',
          password: process.env.DB_PASSWORD || 'example_password',
          database: process.env.DB_DATABASE || 'bot_discord_test',
          entities: [Channel, Category, Guild, Formation, Member, Promotion, Role, Campus],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Channel, Category, Guild, Formation, Member, Promotion, Role, Campus]),
      ],
      providers: [
        ChannelsService,
        CategoriesService,
        GuildsService,
        {
          provide: DiscordBotService,
          useValue: {
            getClient: () => mockClient
          }
        }
      ],
    }).compile();

    channelsService = module.get<ChannelsService>(ChannelsService);
    categoriesService = module.get<CategoriesService>(CategoriesService);
    guildsService = module.get<GuildsService>(GuildsService);
  });

  beforeEach(async () => {
    // Créer une guilde de test
    testGuild = await guildsService.create({
      uuid: '345678901234567890',
      name: 'Test Guild',
      memberCount: '100',
      configuration: {}
    });

    // Créer une catégorie de test
    testCategory = await categoriesService.create({
      uuid: '234567890123456789',
      name: 'Test Category',
      position: 1,
      uuidGuild: testGuild.uuid
    });
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('devrait créer un channel et le lier à une catégorie et une guilde', async () => {
    const createChannelDto = {
      uuid: '123456789012345678',
      name: 'test-channel',
      type: 'text',
      channelPosition: 1,
      uuidCategory: testCategory.uuid,
      uuidGuild: testGuild.uuid
    };

    const channel = await channelsService.create(createChannelDto);
    expect(channel).toBeDefined();
    expect(channel.uuid).toBe(createChannelDto.uuid);
    expect(channel.name).toBe(createChannelDto.name);
    expect(channel.type).toBe(createChannelDto.type);
    expect(channel.channelPosition).toBe(createChannelDto.channelPosition);
    expect(channel.uuidCategory).toBe(testCategory.uuid);
    expect(channel.uuidGuild).toBe(testGuild.uuid);
  });

  it('devrait récupérer tous les channels', async () => {
    const channels = await channelsService.findAll();
    expect(Array.isArray(channels)).toBe(true);
  });

  it('devrait récupérer un channel par son uuid', async () => {
    const channel = await channelsService.create({
      uuid: '123456789012345678',
      name: 'test-channel',
      type: 'text',
      channelPosition: 1,
      uuidCategory: testCategory.uuid,
      uuidGuild: testGuild.uuid
    });

    const foundChannel = await channelsService.findOne(channel.uuid);
    expect(foundChannel).toBeDefined();
    expect(foundChannel?.uuid).toBe(channel.uuid);
  });

  it('devrait mettre à jour un channel', async () => {
    const channel = await channelsService.create({
      uuid: '123456789012345678',
      name: 'test-channel',
      type: 'text',
      channelPosition: 1,
      uuidCategory: testCategory.uuid,
      uuidGuild: testGuild.uuid
    });

    const updateChannelDto = {
      name: 'updated-channel',
      type: 'voice',
      channelPosition: 2
    };

    const updatedChannel = await channelsService.update(channel.uuid, updateChannelDto);
    expect(updatedChannel).toBeDefined();
    expect(updatedChannel?.name).toBe(updateChannelDto.name);
    expect(updatedChannel?.type).toBe(updateChannelDto.type);
    expect(updatedChannel?.channelPosition).toBe(updateChannelDto.channelPosition);
  });

  it('devrait supprimer un channel', async () => {
    const channel = await channelsService.create({
      uuid: '123456789012345678',
      name: 'test-channel',
      type: 'text',
      channelPosition: 1,
      uuidCategory: testCategory.uuid,
      uuidGuild: testGuild.uuid
    });

    await channelsService.remove(channel.uuid);
    const deletedChannel = await channelsService.findOne(channel.uuid);
    expect(deletedChannel).toBeNull();
  });
}); 