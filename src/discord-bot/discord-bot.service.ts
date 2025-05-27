import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordBotService implements OnModuleInit {
  private client: Client;

  constructor(private configService: ConfigService) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.client.login(this.configService.get<string>('DISCORD_BOT_TOKEN'));
      console.log('Bot Discord connecté avec succès!');

      this.setupEventHandlers();
    } catch (error) {
      console.error('Erreur lors de la connexion du bot:', error);
    }
  }

  private setupEventHandlers() {
    this.client.on(Events.ClientReady, () => {
      console.log(`Bot connecté en tant que ${this.client.user?.tag}`);
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      // Ajoutez ici la logique de traitement des messages
      if (message.content.startsWith('!ping')) {
        await message.reply('Pong!');
      }
    });
  }

  getClient(): Client {
    return this.client;
  }
} 