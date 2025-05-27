import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDiscordUserDto } from './dto/create-discord-user.dto';
import { UpdateDiscordUserDto } from './dto/update-discord-user.dto';
import { DiscordUser } from './entities/discord-user.entity';
import { Client } from 'discord.js';

@Injectable()
export class DiscordUsersService {
  constructor(
    @InjectRepository(DiscordUser)
    private discordUserRepository: Repository<DiscordUser>,
    @Inject('DISCORD_CLIENT') private discordClient: Client,
  ) {}

  async create(createDiscordUserDto: CreateDiscordUserDto) {
    const discordUser = this.discordUserRepository.create(createDiscordUserDto);
    const savedUser = await this.discordUserRepository.save(discordUser);
    // Synchronisation de l'avatar après création
    await this.syncDiscordUserAvatar(savedUser.uuidDiscord);
    return savedUser;
  }

  findAll() {
    return this.discordUserRepository.find();
  }

  findOne(uuidDiscord: string) {
    return this.discordUserRepository.findOneBy({ uuidDiscord });
  }

  async update(uuidDiscord: string, updateDiscordUserDto: UpdateDiscordUserDto) {
    const discordUser = await this.discordUserRepository.findOneBy({ uuidDiscord });
    if (!discordUser) {
      return null;
    }
    
    const { discordUsername, discriminator } = updateDiscordUserDto;
    if (discordUsername !== undefined) discordUser.discordUsername = discordUsername;
    if (discriminator !== undefined) discordUser.discriminator = discriminator;
    
    discordUser.updatedAt = new Date();
    return this.discordUserRepository.save(discordUser);
  }

  remove(uuidDiscord: string) {
    return this.discordUserRepository.delete({ uuidDiscord });
  }

  async syncDiscordUserAvatar(uuidDiscord: string) {
    try {
      const user = await this.discordClient.users.fetch(uuidDiscord);
      if (!user) return null;
      await this.discordUserRepository.update(
        { uuidDiscord },
        { avatar: user.avatar || undefined }
      );
      return user.avatar;
    } catch (e) {
      console.error('Erreur lors de la synchro avatar Discord:', e);
      return null;
    }
  }
} 