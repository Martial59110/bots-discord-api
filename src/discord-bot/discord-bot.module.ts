import { Module } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { DiscordBotController } from './discord-bot.controller';
import { Client, GatewayIntentBits } from 'discord.js';

@Module({
  providers: [
    {
      provide: 'DISCORD_CLIENT',
      useFactory: async () => {
        const client = new Client({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
          ],
        });
        await client.login(process.env.DISCORD_BOT_TOKEN);
        return client;
      },
    },
    DiscordBotService,
  ],
  controllers: [DiscordBotController],
  exports: ['DISCORD_CLIENT', DiscordBotService],
})
export class DiscordBotModule {} 