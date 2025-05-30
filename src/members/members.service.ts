import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, Like } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './entities/member.entity';
import { Role } from '../roles/entities/role.entity';
import { Client } from 'discord.js';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,

    @Inject('DISCORD_CLIENT') private discordClient: Client,

    @InjectRepository(DiscordUser)
    private discordUserRepository: Repository<DiscordUser>,
  ) {}

  // Créer un nouveau membre
  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const member = this.membersRepository.create(createMemberDto);
    const saved = await this.membersRepository.save(member);
    // Synchronisation du nickname Discord si possible
    if (saved.uuidGuild && saved.uuidDiscord && saved.guildUsername) {
      try {
        const guild = await this.discordClient.guilds.fetch(saved.uuidGuild);
        const guildMember = await guild.members.fetch(saved.uuidDiscord);
        await guildMember.setNickname(saved.guildUsername);
      } catch (e) {
        // Optionnel : log ou ignorer si le bot n'a pas les droits
      }
    }
    return saved;
  }

  // Récupérer tous les membres
  async findAll(page: number = 1, limit: number = 7, uuidGuild?: string, search?: string): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const where: any = {};
    if (uuidGuild) where.uuidGuild = uuidGuild;
    if (search) where.guildUsername = Like(`%${search}%`);

    const [data, total] = await this.membersRepository.findAndCount({
      where,
      relations: [
        'discordUser',
        'guild',
        'followedPromotions'
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Ajoute les rôles Discord comme avant (si besoin)
    for (const membre of data as any[]) {
      try {
        if (membre.uuidGuild && membre.uuidDiscord) {
          const guild = await this.discordClient.guilds.fetch(membre.uuidGuild);
          const memberDiscord = await guild.members.fetch({ user: membre.uuidDiscord, force: true });
          (membre as any).discordRoles = memberDiscord.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => ({ id: role.id, name: role.name, color: role.color }));
        } else {
          (membre as any).discordRoles = [];
        }
      } catch (e) {
        (membre as any).discordRoles = [];
      }
    }

    return { data, total, page, limit };
  }

  // Récupérer un membre par son uuid
  async findOne(uuidMember: string): Promise<Member> {
    try {
      const member = await this.membersRepository.findOne({
        where: { uuidMember },
        relations: ['resources']
      });

      if (!member) {
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
      }
      return member;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la récupération du membre: ${error.message}`);
    }
  }

  // Récupérer les promotions suivies et gérées par un membre
  async findMemberPromotions(uuidMember: string): Promise<{ followedPromotions: any[], managedPromotions: any[] }> {
    try {
      // Vérifier d'abord si le membre existe
      const member = await this.membersRepository.findOne({
        where: { uuidMember }
      });

      if (!member) {
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
      }

      return {
        followedPromotions: member.followedPromotions || [],
        managedPromotions: member.managedPromotions || []
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la récupération des promotions du membre: ${error.message}`);
    }
  }

  // Mettre à jour un membre
  async update(uuidMember: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const member = await this.findOne(uuidMember);
    const oldUsername = member.guildUsername;
    Object.assign(member, updateMemberDto);
    const saved = await this.membersRepository.save(member);
    // Synchronisation du nickname Discord si le pseudo a changé
    if (updateMemberDto.guildUsername && updateMemberDto.guildUsername !== oldUsername) {
      const guild = await this.discordClient.guilds.fetch(member.uuidGuild);
      const guildMember = await guild.members.fetch(member.uuidDiscord);
      await guildMember.setNickname(updateMemberDto.guildUsername);
    }
    return saved;
  }

  // Supprimer un membre
  async remove(uuidMember: string): Promise<DeleteResult> {
    const result = await this.membersRepository.delete({ uuidMember });
    if (result.affected === 0) {
      throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
    }
    return result;
  }

  async getMemberRoles(uuidMember: string): Promise<Role[]> {
    const member = await this.membersRepository.findOne({
        where: { uuidMember },
        relations: ['roles'],
    });

    if (!member) {
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
    }

    return member.roles;
  }

  async assignRoleToMember(uuidMember: string, uuidRole: string): Promise<Member> {
    const member = await this.membersRepository.findOne({
        where: { uuidMember },
        relations: ['roles'],
    });

    if (!member) {
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
    }

    const role = await this.rolesRepository.findOne({ where: { uuidRole } });
    if (!role) {
        throw new NotFoundException(`Role with UUID ${uuidRole} not found`);
    }

    // Vérifier si le membre possède déjà ce rôle
    if (member.roles.some(r => r.uuidRole === uuidRole)) {
        throw new BadRequestException(`Member already has the role ${uuidRole}`);
    }

    // Ajouter le rôle au membre
    member.roles.push(role);

    // Incrémenter `member_count`
    role.memberCount = parseInt(role.memberCount.toString(), 10) + 1;
    await this.rolesRepository.save(role);

    return await this.membersRepository.save(member);
  }

  async removeRoleFromMember(uuidMember: string, uuidRole: string): Promise<Member> {
    const member = await this.membersRepository.findOne({
        where: { uuidMember },
        relations: ['roles'],
    });

    if (!member) {
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
    }

    const role = await this.rolesRepository.findOne({ where: { uuidRole } });
    if (!role) {
        throw new NotFoundException(`Role with UUID ${uuidRole} not found`);
    }

    // Supprimer le rôle du membre
    member.roles = member.roles.filter(r => r.uuidRole !== uuidRole);

    // Mettre à jour `member_count`
    role.memberCount = Math.max(0, parseInt(role.memberCount.toString(), 10) - 1);
    await this.rolesRepository.save(role);

    return await this.membersRepository.save(member);
  }

  async addDiscordRoleToMember(uuidMember: string, roleId: string): Promise<any> {
    const member = await this.findOne(uuidMember);
    const guild = await this.discordClient.guilds.fetch(member.uuidGuild);
    const guildMember = await guild.members.fetch({ user: member.uuidDiscord, force: true });
    await guildMember.roles.add(roleId);
    // Rafraîchir les rôles Discord
    const discordRoles = guildMember.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => ({ id: role.id, name: role.name, color: role.color }));
    return { ...member, discordRoles };
  }

  async removeDiscordRoleFromMember(uuidMember: string, roleId: string): Promise<any> {
    const member = await this.findOne(uuidMember);
    const guild = await this.discordClient.guilds.fetch(member.uuidGuild);
    const guildMember = await guild.members.fetch({ user: member.uuidDiscord, force: true });
    await guildMember.roles.remove(roleId);
    // Rafraîchir les rôles Discord
    const discordRoles = guildMember.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => ({ id: role.id, name: role.name, color: role.color }));
    return { ...member, discordRoles };
  }

  // Utilitaire pour récupérer la guild Discord
  async getDiscordGuild(uuidGuild: string) {
    return await this.discordClient.guilds.fetch(uuidGuild);
  }

  // Utilitaire pour récupérer les uuidDiscord déjà membres pour une guilde
  async getExistingDiscordUuidsForGuild(uuidGuild: string): Promise<string[]> {
    const members = await this.membersRepository.find({
      where: { uuidGuild },
      select: ['uuidDiscord']
    });
    return members.map(m => m.uuidDiscord);
  }

  async findByGuild(uuidGuild: string): Promise<Member[]> {
    return this.membersRepository.find({
      where: { uuidGuild },
      relations: ['discordUser']
    });
  }

  async removeMemberCompletely(uuidMember: string) {
    // 1. Trouver le membre
    const member = await this.membersRepository.findOne({
      where: { uuidMember },
      relations: ['discordUser']
    });
    if (!member) throw new NotFoundException('Member not found');

    // 2. Retirer tous les rôles Discord
    if (member.uuidGuild && member.uuidDiscord) {
      try {
        const guild = await this.discordClient.guilds.fetch(member.uuidGuild);
        const guildMember = await guild.members.fetch(member.uuidDiscord);
        const rolesToRemove = guildMember.roles.cache.filter(role => role.name !== '@everyone');
        for (const role of rolesToRemove.values()) {
          await guildMember.roles.remove(role.id);
        }
      } catch (e) {
        // Optionnel : log ou ignorer si le membre n'est plus sur le serveur
      }
    }

    // 3. Supprimer le member
    await this.membersRepository.delete({ uuidMember });

    // 4. Supprimer le discord_user associé
    if (member.discordUser && member.discordUser.uuidDiscord) {
      // On suppose que le repository DiscordUser existe et s'appelle discordUserRepository
      try {
        await this.discordUserRepository.delete({ uuidDiscord: member.discordUser.uuidDiscord });
      } catch (e) {
        // Optionnel : log ou ignorer si déjà supprimé
      }
    }

    return { success: true };
  }
}