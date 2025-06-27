import { Controller, Get } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('discord-bot')
export class DiscordBotController {
  constructor(private readonly discordBotService: DiscordBotService) {}

  @Get('status')
  @Public()
  getBotStatus() {
    const client = this.discordBotService.getClient();
    return {
      status: client.isReady() ? 'online' : 'offline',
      username: client.user?.tag,
      uptime: client.uptime,
    };
  }
} 