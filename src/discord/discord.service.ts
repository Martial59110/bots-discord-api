import { Injectable, Inject } from '@nestjs/common';
import { Client } from 'discord.js';

@Injectable()
export class DiscordService {
  constructor(@Inject('DISCORD_CLIENT') private readonly client: Client) {}

  async getGuild(uuidGuild: string) {
    return this.client.guilds.fetch(uuidGuild);
  }
} 