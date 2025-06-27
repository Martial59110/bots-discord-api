import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordBotService } from './discord-bot.service';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';

// Mock discord.js
vi.mock('discord.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    login: vi.fn(),
    on: vi.fn(),
    user: {
      tag: 'TestBot#1234',
    },
    isReady: vi.fn(() => true),
    uptime: 123456,
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 3,
  },
  Events: {
    ClientReady: 'ready',
    MessageCreate: 'messageCreate',
  },
}));

describe('DiscordBotService', () => {
  let service: DiscordBotService;
  let configService: ConfigService;

  const mockConfigService = {
    get: vi.fn(() => 'test-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordBotService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DiscordBotService>(DiscordBotService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have ConfigService injected', () => {
    expect(configService).toBeDefined();
  });

  it('should create a Discord client with correct intents', () => {
    expect(Client).toHaveBeenCalledWith({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  });

  it('should implement OnModuleInit interface', () => {
    expect('onModuleInit' in service).toBe(true);
  });

  describe('getClient', () => {
    it('should return the Discord client', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });
  });

  describe('onModuleInit', () => {
    it('should call client.login with bot token', async () => {
      const mockClient = {
        login: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        user: { tag: 'TestBot#1234' },
      };

      // Mock the client property
      (service as any).client = mockClient;

      await service.onModuleInit();

      expect(mockClient.login).toHaveBeenCalledWith('test-token');
    });

    it('should handle login errors', async () => {
      const mockClient = {
        login: vi.fn().mockRejectedValue(new Error('Login failed')),
        on: vi.fn(),
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock the client property
      (service as any).client = mockClient;

      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith('Erreur lors de la connexion du bot:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('setupEventHandlers', () => {
    it('should set up event handlers', () => {
      const mockClient = {
        on: vi.fn(),
        user: { tag: 'TestBot#1234' },
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock the client property and call the private method
      (service as any).client = mockClient;
      (service as any).setupEventHandlers();

      expect(mockClient.on).toHaveBeenCalledWith(Events.ClientReady, expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith(Events.MessageCreate, expect.any(Function));

      consoleSpy.mockRestore();
    });
  });
}); 