import { Injectable } from '@nestjs/common';
import { DiscordBotService } from '../discord-bot/discord-bot.service';
import { ChannelType } from 'discord.js';
import { Promotion } from './entities/promotion.entity';
import { Member } from '../members/entities/member.entity';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class PromotionsBotService {
  constructor(
    private readonly discordBotService: DiscordBotService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('PromotionsBotService');
  }

  getClient() {
    return this.discordBotService.getClient();
  }

  async createPromotionRole(guildId: string, promotionName: string) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const discordRole = await guild.roles.create({
      name: promotionName,
      color: '#000000',
      reason: 'Création automatique du rôle pour la promotion'
    });
    return discordRole;
  }

  async createPromotionCategory(guildId: string, promotionName: string, roleId: string) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const category = await guild.channels.create({
      name: promotionName,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: ['ViewChannel'],
        },
        {
          id: roleId,
          allow: ['ViewChannel'],
        }
      ]
    });
    return category;
  }

  async createPromotionChannels(guildId: string, categoryId: string, channels: any[]) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const createdForums: { [templateForumId: string]: string } = {};
    const createdChannels: any[] = [];

    for (const ch of channels) {
      const channelType = this.mapChannelType(ch.type);
      let channelData: any = {
        name: ch.name,
        type: channelType,
        position: ch.channelPosition,
        parent: categoryId
      };

      if (channelType === ChannelType.GuildForum) {
        channelData = {
          name: ch.name,
          type: channelType,
          position: ch.channelPosition,
          parent: categoryId
        };
      }

      const createdChannel = await guild.channels.create(channelData);
      createdChannels.push(createdChannel);

      if (channelType === ChannelType.GuildForum && ch.uuid) {
        createdForums[ch.uuid] = createdChannel.id;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const validTypes = [0, 2, 5, 15];
    const allCategoryChannels = guild.channels.cache
      .filter(c => c.parentId === categoryId && validTypes.includes(c.type))
      .sort((a, b) => (Number((a as any).rawPosition ?? 0) - Number((b as any).rawPosition ?? 0)));

    const finalOrder = channels.map((ch) => {
      const discordChannel = allCategoryChannels.find(dc => dc.name === ch.name && dc.type === this.mapChannelType(ch.type));
      return discordChannel
        ? { channel: discordChannel.id, position: Number(ch.channelPosition) }
        : null;
    }).filter((f): f is { channel: string; position: number } => f !== null);

    allCategoryChannels.forEach((c, idx) => {
      if (!finalOrder.find(f => f.channel === c.id)) {
        finalOrder.push({ channel: c.id, position: Number(channels.length + idx) });
      }
    });

    try {
      await guild.channels.setPositions(finalOrder);
    } catch (e) {
      this.logger.warn('Erreur lors du bulk setPositions des channels', e);
    }

    return { createdChannels, createdForums };
  }

  async createPromotionThreads(guildId: string, forums: { [key: string]: string }, threads: any[]) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const sortedThreads = threads.slice().sort((a, b) => (a.threadPosition ?? 0) - (b.threadPosition ?? 0));

    for (const thread of sortedThreads.reverse()) {
      const discordForumId = forums[thread.forumId];
      const forum = guild.channels.cache.get(discordForumId);
      
      if (forum && forum.type === ChannelType.GuildForum && typeof (forum as any).threads?.create === 'function') {
        await (forum as any).threads.create({ name: thread.name, message: { content: "Bienvenue dans ce thread !" } });
      } else {
        this.logger.warn('Impossible de créer le thread, forumId non trouvé ou mauvais type:', discordForumId, forum?.type);
      }
    }
  }

  async updatePromotionRole(guildId: string, roleId: string, newName: string) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const role = await guild.roles.fetch(roleId);
    if (role) {
      await role.setName(newName, 'Mise à jour du nom de la promotion');
    }
  }

  async updateCategoryPosition(guildId: string, categoryId: string, newPosition: number) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const category = await guild.channels.fetch(categoryId);

    if (category) {
      const categoriesArr = Array.from(
        guild.channels.cache
          .filter(c => c.type === ChannelType.GuildCategory)
          .sort((a, b) => a.position - b.position)
          .values()
      );

      const currentIndex = categoriesArr.findIndex(c => c.id === category.id);
      if (currentIndex === -1) throw new Error('Catégorie non trouvée dans Discord');
      const [removed] = categoriesArr.splice(currentIndex, 1);
      categoriesArr.splice(newPosition, 0, removed);

      const positions = categoriesArr.map((c, idx) => ({
        channel: c.id,
        position: idx
      }));
      await guild.channels.setPositions(positions);
    }
  }

  async deletePromotionChannels(guildId: string, categoryId: string) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const category = await guild.channels.fetch(categoryId);

    if (category) {
      const channels = guild.channels.cache.filter(c => c.parentId === categoryId && c.type !== ChannelType.GuildCategory.valueOf());
      for (const channel of channels.values()) {
        try {
          await channel.delete('Suppression de la promotion');
        } catch (error) {
          this.logger.warn(`Impossible de supprimer le channel ${channel.id}:`, error);
        }
      }
      await category.delete('Suppression de la promotion');
    }
  }

  async addMemberRoles(guildId: string, memberId: string, roleIds: string[]) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const guildMember = await guild.members.fetch(memberId);
    
    for (const roleId of roleIds) {
      await guildMember.roles.add(roleId);
    }
  }

  async removeMemberRoles(guildId: string, memberId: string, roleIds: string[]) {
    const discordClient = this.discordBotService.getClient();
    const guild = await discordClient.guilds.fetch(guildId);
    const guildMember = await guild.members.fetch(memberId);
    
    for (const roleId of roleIds) {
      await guildMember.roles.remove(roleId);
    }
  }

  private mapChannelType(type: string) {
    switch (type) {
      case 'text': return ChannelType.GuildText;
      case 'voice': return ChannelType.GuildVoice;
      case 'forum': return ChannelType.GuildForum;
      case 'announcement': return ChannelType.GuildAnnouncement;
      default: return ChannelType.GuildText;
    }
  }
} 