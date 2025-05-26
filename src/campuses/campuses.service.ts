import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { Campus } from './entities/campus.entity';
import { Role } from 'src/roles/entities/role.entity';
import fetch from 'node-fetch';

@Injectable()
export class CampusesService {
  constructor(
    @InjectRepository(Campus)
    private campusRepository: Repository<Campus>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createCampusDto: CreateCampusDto): Promise<Campus> {
    try {
      let uuidRole = createCampusDto.uuidRole;
      console.log('uuidRole reçu dans le DTO:', uuidRole, typeof uuidRole); // LOG pour debug
      if (!uuidRole || typeof uuidRole !== 'string' || uuidRole.trim() === '') {
        // Création du rôle Discord via l'API REST
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) {
          throw new BadRequestException('Le token du bot Discord (DISCORD_BOT_TOKEN) est manquant dans les variables d\'environnement');
        }
        const response = await fetch(`https://discord.com/api/v10/guilds/${createCampusDto.uuidGuild}/roles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: `Campus ${createCampusDto.name}` })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new BadRequestException(error.message || 'Erreur lors de la création du rôle Discord');
        }
        const data = await response.json();
        console.log('Réponse Discord:', data); // LOG pour debug
        uuidRole = data.id;
        if (!uuidRole) {
          throw new BadRequestException('Impossible de récupérer l\'ID du rôle Discord. Réponse: ' + JSON.stringify(data));
        }
      }
      const newRole = this.roleRepository.create({
        uuidRole: uuidRole,
        uuidGuild: createCampusDto.uuidGuild,
        name: createCampusDto.name,
        memberCount: 0,
        rolePosition: 0,
        hoist: false,
        color: "#000000",
      });
      const savedRole = await this.roleRepository.save(newRole);
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
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (!botToken) {
        throw new BadRequestException('Le token du bot Discord (DISCORD_BOT_TOKEN) est manquant');
      }
      // Appel PATCH à l'API Discord pour modifier le nom du rôle
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${campus.uuidGuild}/roles/${campus.uuidRole}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: `Campus ${updateCampusDto.name}` })
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(error.message || 'Erreur lors de la modification du rôle Discord');
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
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      throw new BadRequestException('Le token du bot Discord (DISCORD_BOT_TOKEN) est manquant');
    }
    if (campus.uuidRole && campus.uuidGuild) {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${campus.uuidGuild}/roles/${campus.uuidRole}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // On ignore l'erreur si le rôle n'existe déjà plus
    }

    return this.campusRepository.delete({ uuidCampus });
  }
}
