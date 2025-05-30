import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Query,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AssignRoleToMemberDto } from '../roles/dto/assign-role-to-member.dto';
import { UpdateMemberRolesDto } from '../roles/dto/update-member-roles.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Member } from './entities/member.entity';
import { Role } from '../roles/entities/role.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { DiscordService } from '../discord/discord.service';
import { GuildMember, Collection } from 'discord.js';

@ApiTags('members')
@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly discordService: DiscordService
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un nouveau membre',
    description:
      'Crée un nouveau membre dans la base de données avec les informations fournies.',
  })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Le membre a été créé avec succès.',
    type: Member,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides fournies dans la requête.',
  })
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer tous les membres',
    description:
      'Retourne la liste de tous les membres enregistrés dans la base de données.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste de tous les membres récupérée avec succès.',
    type: [Member],
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 2,
    @Query('uuidGuild') uuidGuild?: string,
    @Query('search') search?: string
  ) {
    return this.membersService.findAll(Number(page), Number(limit), uuidGuild, search);
  }

  @Get(':uuid')
  @ApiOperation({
    summary: 'Récupérer un membre par son UUID',
    description:
      'Recherche et retourne un membre spécifique en utilisant son UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID unique du membre à rechercher',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Le membre a été trouvé et récupéré avec succès.',
    type: Member,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Aucun membre trouvé avec l'UUID fourni.",
  })
  findOne(@Param('uuid') uuid: string) {
    return this.membersService.findOne(uuid);
  }

  @Put(':uuid')
  @ApiOperation({
    summary: 'Mettre à jour un membre',
    description:
      "Met à jour les informations d'un membre existant en utilisant son UUID.",
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID unique du membre à mettre à jour',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateMemberDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Le membre a été mis à jour avec succès.',
    type: Member,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides fournies dans la requête.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Aucun membre trouvé avec l'UUID fourni.",
  })
  update(
    @Param('uuid') uuid: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.membersService.update(uuid, updateMemberDto);
  }

  @Patch(':uuid')
  @ApiOperation({
    summary: 'Mettre à jour partiellement un membre',
    description: "Met à jour partiellement les informations d'un membre existant."
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID unique du membre à mettre à jour',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateMemberDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Le membre a été mis à jour avec succès.',
    type: Member,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides fournies dans la requête.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Aucun membre trouvé avec l'UUID fourni.",
  })
  patchUpdate(
    @Param('uuid') uuid: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.membersService.update(uuid, updateMemberDto);
  }

  @Delete(':uuid')
  @ApiOperation({
    summary: 'Supprimer un membre',
    description:
      'Supprime un membre existant de la base de données en utilisant son UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID unique du membre à supprimer',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Le membre a été supprimé avec succès.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Aucun membre trouvé avec l'UUID fourni.",
  })
  remove(@Param('uuid') uuid: string) {
    return this.membersService.remove(uuid);
  }

  @Get(':uuid_member/roles')
  @ApiOperation({ summary: 'Récupérer tous les rôles liés à un membre' })
  @ApiParam({ name: 'uuid_member', description: 'UUID du membre' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des rôles du membre',
    type: [Role],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Membre non trouvé',
  })
  getMemberRoles(@Param('uuid_member') uuid_member: string) {
    return this.membersService.getMemberRoles(uuid_member);
  }

  @Put(':uuid_member/assign-role/:uuid_role')
  @ApiOperation({ summary: 'Assigner un rôle unique à un membre' })
  @ApiParam({ name: 'uuid_member', description: 'UUID du membre' })
  @ApiParam({ name: 'uuid_role', description: 'UUID du rôle à assigner' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rôle assigné avec succès',
    type: Member,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Le membre possède déjà ce rôle',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Membre ou rôle non trouvé',
  })
  assignRole(
    @Param('uuid_member') uuid_member: string,
    @Param('uuid_role') uuid_role: string,
  ) {
    return this.membersService.assignRoleToMember(uuid_member, uuid_role);
  }

  @Delete(':uuid_member/roles/:uuid_role')
  @ApiOperation({
    summary: "Supprimer un rôle d'un membre",
    description:
      "Supprime un rôle spécifique d'un membre, sans affecter les autres rôles.",
  })
  @ApiParam({
    name: 'uuid_member',
    description: 'UUID du membre',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'uuid_role',
    description: 'UUID du rôle à supprimer',
    example: '172653890987364567',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Le rôle a été supprimé du membre avec succès.',
    type: Member,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Membre ou rôle non trouvé.',
  })
  removeRoleFromMember(
    @Param('uuid_member') uuid_member: string,
    @Param('uuid_role') uuid_role: string,
  ) {
    return this.membersService.removeRoleFromMember(uuid_member, uuid_role);
  }

  @Get(':uuid/promotions')
  @ApiOperation({
    summary: 'Récupérer les promotions suivies et gérées par un membre',
    description:
      'Retourne les promotions suivies et gérées par un membre spécifique en utilisant son UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID unique du membre à rechercher',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Les promotions du membre ont été récupérées avec succès.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Aucun membre trouvé avec l'UUID fourni.",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Erreur lors de la récupération des promotions du membre.",
  })
  findMemberPromotions(@Param('uuid') uuid: string) {
    return this.membersService.findMemberPromotions(uuid);
  }

  @Put(':uuidMember/add-discord-role/:roleId')
  async addDiscordRoleToMember(@Param('uuidMember') uuidMember: string, @Param('roleId') roleId: string) {
    return this.membersService.addDiscordRoleToMember(uuidMember, roleId);
  }

  @Put(':uuidMember/remove-discord-role/:roleId')
  async removeDiscordRoleFromMember(@Param('uuidMember') uuidMember: string, @Param('roleId') roleId: string) {
    return this.membersService.removeDiscordRoleFromMember(uuidMember, roleId);
  }

  @Get('guild/:uuidGuild/discord-users-available')
  async getDiscordUsersAvailable(@Param('uuidGuild') uuidGuild: string) {
    try {
      console.log('1. Récupération de la guilde:', uuidGuild);
      const guild = await this.discordService.getGuild(uuidGuild);
      if (!guild) {
        throw new NotFoundException('Guild not found');
      }

      console.log('2. Récupération des membres existants');
      const existingMembers = await this.membersService.findByGuild(uuidGuild);
      console.log('Membres existants:', existingMembers.length);
      const existingUuidDiscords = new Set(existingMembers.map(m => m.uuidDiscord));

      console.log('3. Récupération des membres Discord');
      const members = await Promise.race<Collection<string, GuildMember>>([
        guild.members.fetch(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout fetching members')), 60000)
        )
      ]);
      console.log('Membres Discord récupérés:', members.size);

      console.log('4. Filtrage des membres disponibles');
      const availableUsers = Array.from(members.values())
        .filter(member => !existingUuidDiscords.has(member.id))
        .map(member => ({
          uuidDiscord: member.id,
          username: member.user.username,
          displayName: member.displayName,
          avatar: member.user.avatar
        }));
      console.log('Membres disponibles:', availableUsers.length);

      return availableUsers;
    } catch (error) {
      console.error('Erreur détaillée:', error);
      if (error.message === 'Timeout fetching members') {
        throw new HttpException('Le serveur met trop de temps à répondre. Veuillez réessayer.', 504);
      }
      throw error;
    }
  }

  @Delete(':uuidMember/full')
  async removeMemberCompletely(@Param('uuidMember') uuidMember: string) {
    return this.membersService.removeMemberCompletely(uuidMember);
  }
}
