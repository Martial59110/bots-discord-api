import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { Campus } from './entities/campus.entity';
import { Role } from 'src/roles/entities/role.entity';
import { CampusBotService } from './campus-bot.service';

@Injectable()
export class CampusesService {
  constructor(
    @InjectRepository(Campus)
    private campusRepository: Repository<Campus>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    private readonly campusBotService: CampusBotService,
  ) {}

  async create(createCampusDto: CreateCampusDto): Promise<Campus> {
    try {
      if (!createCampusDto.uuidGuild) {
        throw new BadRequestException('UUID du serveur Discord manquant');
      }

      // Création du rôle Discord //
      const discordRole = await this.campusBotService.createCampusRole(
        createCampusDto.uuidGuild,
        createCampusDto.name
      );

      // Sauvegarde du rôle en BDD //
      const newRole = this.roleRepository.create({
        uuidRole: discordRole.id,
        uuidGuild: createCampusDto.uuidGuild,
        name: createCampusDto.name,
        memberCount: 0,
        rolePosition: discordRole.position,
        hoist: false,
        color: discordRole.hexColor,
      });
      const savedRole = await this.roleRepository.save(newRole);

      // Création du campus //
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
    return this.campusRepository.find({ relations: ['promotions'] });
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

   
    if (updateCampusDto.name && updateCampusDto.name !== campus.name) {
      await this.campusBotService.updateCampusRole(
        campus.uuidGuild,
        campus.uuidRole,
        updateCampusDto.name
      );
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

    // Suppression du rôle Discord associé via le service dédié
    if (campus.uuidRole && campus.uuidGuild) {
      await this.campusBotService.deleteCampusRole(campus.uuidGuild, campus.uuidRole);
    }

    return this.campusRepository.delete({ uuidCampus });
  }
}
