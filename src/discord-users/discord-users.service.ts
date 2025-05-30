import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDiscordUserDto } from './dto/create-discord-user.dto';
import { UpdateDiscordUserDto } from './dto/update-discord-user.dto';
import { DiscordUser } from './entities/discord-user.entity';
import { Client } from 'discord.js';
import { Member } from '../members/entities/member.entity';

@Injectable()
export class DiscordUsersService {
  constructor(
    @InjectRepository(DiscordUser)
    private discordUserRepository: Repository<DiscordUser>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
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

  async syncDiscordUserInfos(uuidDiscord: string, uuidGuild?: string) {
    try {
      const user = await this.discordClient.users.fetch(uuidDiscord);
      let displayName = user.username;
      if (uuidGuild) {
        console.log('Avant fetch Discord', { uuidGuild, uuidDiscord, date: new Date().toISOString() });
        const guild = await this.discordClient.guilds.fetch(uuidGuild);
        const member = await guild.members.fetch({ user: uuidDiscord, force: true });
        displayName = member.displayName;
        console.log('Après fetch Discord', { displayName, date: new Date().toISOString() });
      }
      // Met à jour DiscordUser
      await this.discordUserRepository.update(
        { uuidDiscord: String(uuidDiscord) },
        {
          discordUsername: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar || undefined
        }
      );
      // Met à jour le display name côté Member
      if (uuidGuild) {
        console.log('Tentative update member', { uuidDiscord: String(uuidDiscord), uuidGuild: String(uuidGuild), displayName });
        const result = await this.memberRepository.update(
          { uuidDiscord: String(uuidDiscord), uuidGuild: String(uuidGuild) },
          { guildUsername: displayName }
        );
        console.log('Résultat update', result);
        const updatedMember = await this.memberRepository.findOneBy({ uuidDiscord: String(uuidDiscord), uuidGuild: String(uuidGuild) });
        console.log('Member après update:', updatedMember);
      } else {
        console.log('Tentative update member (sans guild)', { uuidDiscord: String(uuidDiscord), displayName });
        const result = await this.memberRepository.update(
          { uuidDiscord: String(uuidDiscord) },
          { guildUsername: displayName }
        );
        console.log('Résultat update', result);
        const updatedMember = await this.memberRepository.findOneBy({ uuidDiscord: String(uuidDiscord) });
        console.log('Member après update (sans guild):', updatedMember);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async syncAllDiscordUsersInfos() {
    const users = await this.discordUserRepository.find();
    const results: Array<{ success: boolean; error?: any }> = [];
    for (const user of users) {
      results.push(await this.syncDiscordUserInfos(user.uuidDiscord));
    }
    return { success: true, results };
  }
} 