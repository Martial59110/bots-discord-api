import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { Campus } from './entities/campus.entity';
import { Role } from 'src/roles/entities/role.entity';
import { DiscordBotService } from '../discord-bot/discord-bot.service';

@Injectable()
export class CampusesService {
  constructor(
    @InjectRepository(Campus)
    private campusRepository: Repository<Campus>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    private readonly discordBotService: DiscordBotService,
  ) {}

  async create(createCampusDto: CreateCampusDto): Promise<Campus> {
    try {
      const discordClient = this.discordBotService.getClient();
      
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      // Récupérer le serveur Discord
      const guild = await discordClient.guilds.fetch(createCampusDto.uuidGuild as string);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      // Créer le rôle sur Discord
      const role = await guild.roles.create({
        name: `Campus ${createCampusDto.name}`,
        color: '#000000',
        reason: 'Création automatique du rôle pour le campus'
      });

      // Créer le rôle dans la base de données
      const newRole = this.roleRepository.create({
        uuidRole: role.id,
        uuidGuild: createCampusDto.uuidGuild,
        name: createCampusDto.name,
        memberCount: 0,
        rolePosition: role.position,
        hoist: false,
        color: role.hexColor,
      });
      const savedRole = await this.roleRepository.save(newRole);

      // Créer le campus
      const newCampus = this.campusRepository.create({
        ...createCampusDto,
        uuidRole: savedRole.uuidRole,
      });
      return await this.campusRepository.save(newCampus);
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création du campus: ' + error.message);
    }
  }

  findAll() {
    return this.campusRepository.find();
  }

  findOne(uuidCampus: string) {
    if (!uuidCampus) {
      throw new NotFoundException('UUID du campus manquant');
    }
    return this.campusRepository.findOneBy({ uuidCampus });
  }

  async update(uuidCampus: string, updateCampusDto: UpdateCampusDto) {
    const campus = await this.campusRepository.findOneBy({ uuidCampus });
    if (!campus) {
      throw new NotFoundException(`Campus with UUID "${uuidCampus}" not found`);
    }

    // Si le nom change, on met aussi à jour le nom du rôle Discord
    if (updateCampusDto.name && updateCampusDto.name !== campus.name) {
      const discordClient = this.discordBotService.getClient();
      if (!discordClient.user) {
        throw new BadRequestException('Le bot n\'est pas encore connecté à Discord');
      }

      const guild = await discordClient.guilds.fetch(campus.uuidGuild as string);
      if (!guild) {
        throw new BadRequestException('Serveur Discord non trouvé');
      }

      const role = await guild.roles.fetch(campus.uuidRole);
      if (role) {
        await role.setName(`Campus ${updateCampusDto.name}`, 'Mise à jour du nom du campus');
      }
    }

    Object.assign(campus, updateCampusDto);
    return this.campusRepository.save(campus);
  }

  async remove(uuidCampus: string) {
    if (!uuidCampus) {
      throw new NotFoundException(`Campus with UUID "${uuidCampus}" not found`);
    }
    const campus = await this.campusRepository.findOneBy({ uuidCampus });
    if (!campus) {
      throw new NotFoundException(`Campus with UUID "${uuidCampus}" not found`);
    }

    // Suppression du rôle Discord associé
    if (campus.uuidRole && campus.uuidGuild) {
      const discordClient = this.discordBotService.getClient();
      if (discordClient.user) {
        const guild = await discordClient.guilds.fetch(campus.uuidGuild as string);
        if (guild) {
          const role = await guild.roles.fetch(campus.uuidRole);
          if (role) {
            await role.delete('Suppression du campus');
          }
        }
      }
    }

    return this.campusRepository.delete({ uuidCampus });
  }
}
