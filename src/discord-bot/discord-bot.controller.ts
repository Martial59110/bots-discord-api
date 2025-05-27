import { Controller, Get } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';

@Controller('discord-bot')
export class DiscordBotController {
  constructor(private readonly discordBotService: DiscordBotService) {}

  @Get('status')
  getBotStatus() {
    const client = this.discordBotService.getClient();
    return {
      status: client.isReady() ? 'online' : 'offline',
      username: client.user?.tag,
      uptime: client.uptime,
    };
  }
} 