import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordBotController } from './discord-bot.controller';
import { DiscordBotService } from './discord-bot.service';

describe('DiscordBotController', () => {
  let controller: DiscordBotController;
  let service: DiscordBotService;

  const mockClient = {
    isReady: vi.fn(),
    user: {
      tag: 'TestBot#1234',
    },
    uptime: 123456,
  };

  const mockDiscordBotService = {
    getClient: vi.fn(() => mockClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscordBotController],
      providers: [
        {
          provide: DiscordBotService,
          useValue: mockDiscordBotService,
        },
      ],
    }).compile();

    controller = module.get<DiscordBotController>(DiscordBotController);
    service = module.get<DiscordBotService>(DiscordBotService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have DiscordBotService injected', () => {
    expect(service).toBeDefined();
  });

  describe('getBotStatus', () => {
    it('should return online status when bot is ready', () => {
      mockClient.isReady.mockReturnValue(true);

      const result = controller.getBotStatus();

      expect(service.getClient).toHaveBeenCalled();
      expect(mockClient.isReady).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'online',
        username: 'TestBot#1234',
        uptime: 123456,
      });
    });

    it('should return offline status when bot is not ready', () => {
      mockClient.isReady.mockReturnValue(false);

      const result = controller.getBotStatus();

      expect(service.getClient).toHaveBeenCalled();
      expect(mockClient.isReady).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'offline',
        username: 'TestBot#1234',
        uptime: 123456,
      });
    });

    it('should handle undefined user tag', () => {
      mockClient.isReady.mockReturnValue(true);
      mockClient.user = undefined;

      const result = controller.getBotStatus();

      expect(result).toEqual({
        status: 'online',
        username: undefined,
        uptime: 123456,
      });
    });
  });
}); 