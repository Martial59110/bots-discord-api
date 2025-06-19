import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, Like } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './entities/member.entity';
import { Role } from '../roles/entities/role.entity';
import { Client } from 'discord.js';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';
import { PinoLogger } from 'nestjs-pino';

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
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('MembersService');
  }

  // Créer un nouveau membre
  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    this.logger.info(`Tentative de création d'un membre avec l'UUID Discord : ${createMemberDto.uuidDiscord}`);
    
    const member = this.membersRepository.create(createMemberDto);
    const saved = await this.membersRepository.save(member);
    
    this.logger.info(`Membre "${saved.guildUsername}" (UUID: ${saved.uuidMember}) créé avec succès.`);
    
    // Synchronisation du nickname Discord si possible
    if (saved.uuidGuild && saved.uuidDiscord && saved.guildUsername) {
      try {
        this.logger.info(`Synchronisation du nickname Discord pour le membre ${saved.uuidMember}`);
        const guild = await this.discordClient.guilds.fetch(saved.uuidGuild);
        const guildMember = await guild.members.fetch(saved.uuidDiscord);
        await guildMember.setNickname(saved.guildUsername);
        this.logger.info(`Nickname Discord synchronisé avec succès pour ${saved.guildUsername}`);
      } catch (e) {
        this.logger.warn(`Échec de la synchronisation du nickname Discord pour ${saved.guildUsername}: ${e.message}`);
      }
    }
    return saved;
  }

  // Récupérer tous les membres
  async findAll(page: number = 1, limit: number = 7, uuidGuild?: string, search?: string): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    this.logger.info(`Récupération des membres - Page: ${page}, Limite: ${limit}, Guilde: ${uuidGuild || 'toutes'}, Recherche: ${search || 'aucune'}`);
    
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

    this.logger.info(`${data.length} membres récupérés sur un total de ${total}`);

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
    this.logger.info(`Recherche du membre avec l'UUID : ${uuidMember}`);
    
    try {
      const member = await this.membersRepository.findOne({
        where: { uuidMember },
        relations: ['resources']
      });

      if (!member) {
        this.logger.warn(`Membre non trouvé pour l'UUID : ${uuidMember}`);
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
      }
      
      this.logger.info(`Membre "${member.guildUsername}" trouvé.`);
      return member;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la récupération du membre ${uuidMember}`, error.stack);
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
    this.logger.info(`Tentative de mise à jour du membre avec l'UUID : ${uuidMember}`);
    
    const member = await this.findOne(uuidMember);
    const oldUsername = member.guildUsername;
    Object.assign(member, updateMemberDto);
    const saved = await this.membersRepository.save(member);
    
    this.logger.info(`Membre "${saved.guildUsername}" (UUID: ${uuidMember}) mis à jour avec succès.`);
    
    // Synchronisation du nickname Discord si le pseudo a changé
    if (updateMemberDto.guildUsername && updateMemberDto.guildUsername !== oldUsername) {
      try {
        this.logger.info(`Mise à jour du nickname Discord de "${oldUsername}" vers "${updateMemberDto.guildUsername}"`);
        const guild = await this.discordClient.guilds.fetch(member.uuidGuild);
        const guildMember = await guild.members.fetch(member.uuidDiscord);
        await guildMember.setNickname(updateMemberDto.guildUsername);
        this.logger.info(`Nickname Discord mis à jour avec succès.`);
      } catch (e) {
        this.logger.warn(`Échec de la mise à jour du nickname Discord: ${e.message}`);
      }
    }
    return saved;
  }

  // Supprimer un membre
  async remove(uuidMember: string): Promise<DeleteResult> {
    this.logger.info(`Tentative de suppression du membre avec l'UUID : ${uuidMember}`);
    
    // Récupérer le membre pour avoir son nom avant suppression
    const member = await this.membersRepository.findOne({ where: { uuidMember } });
    
    const result = await this.membersRepository.delete({ uuidMember });
    if (result.affected === 0) {
      this.logger.warn(`Suppression échouée : Membre non trouvé pour l'UUID : ${uuidMember}`);
      throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
    }
    
    this.logger.info(`Membre "${member?.guildUsername || 'inconnu'}" (UUID: ${uuidMember}) supprimé avec succès.`);
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
    this.logger.info(`Tentative d'assignation du rôle ${uuidRole} au membre ${uuidMember}`);
    
    const member = await this.membersRepository.findOne({
        where: { uuidMember },
        relations: ['roles'],
    });

    if (!member) {
        this.logger.warn(`Assignation échouée : Membre non trouvé pour l'UUID : ${uuidMember}`);
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
    }

    const role = await this.rolesRepository.findOne({ where: { uuidRole } });
    if (!role) {
        this.logger.warn(`Assignation échouée : Rôle non trouvé pour l'UUID : ${uuidRole}`);
        throw new NotFoundException(`Role with UUID ${uuidRole} not found`);
    }

    // Vérifier si le membre possède déjà ce rôle
    if (member.roles.some(r => r.uuidRole === uuidRole)) {
        this.logger.warn(`Le membre ${uuidMember} possède déjà le rôle ${uuidRole}`);
        throw new BadRequestException(`Member already has the role ${uuidRole}`);
    }

    // Ajouter le rôle au membre
    member.roles.push(role);

    // Incrémenter `member_count`
    role.memberCount = parseInt(role.memberCount.toString(), 10) + 1;
    await this.rolesRepository.save(role);

    const savedMember = await this.membersRepository.save(member);
    this.logger.info(`Rôle "${role.name}" assigné avec succès au membre "${member.guildUsername}"`);
    return savedMember;
  }

  async removeRoleFromMember(uuidMember: string, uuidRole: string): Promise<Member> {
    this.logger.info(`Tentative de retrait du rôle ${uuidRole} du membre ${uuidMember}`);
    
    const member = await this.membersRepository.findOne({
        where: { uuidMember },
        relations: ['roles'],
    });

    if (!member) {
        this.logger.warn(`Retrait échoué : Membre non trouvé pour l'UUID : ${uuidMember}`);
        throw new NotFoundException(`Member with UUID ${uuidMember} not found`);
    }

    const roleIndex = member.roles.findIndex(r => r.uuidRole === uuidRole);
    if (roleIndex === -1) {
        this.logger.warn(`Le membre ${uuidMember} ne possède pas le rôle ${uuidRole}`);
        throw new BadRequestException(`Member does not have the role ${uuidRole}`);
    }

    const role = member.roles[roleIndex];
    member.roles.splice(roleIndex, 1);

    // Décrémenter `member_count`
    role.memberCount = Math.max(0, parseInt(role.memberCount.toString(), 10) - 1);
    await this.rolesRepository.save(role);

    const savedMember = await this.membersRepository.save(member);
    this.logger.info(`Rôle "${role.name}" retiré avec succès du membre "${member.guildUsername}"`);
    return savedMember;
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