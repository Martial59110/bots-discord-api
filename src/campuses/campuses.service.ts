/* 
 * Service principal pour la gestion des campus
 * 
 * Ce service gère toute la logique métier autour des campus :
 * - CRUD basique (créer, lire, modifier, supprimer)
 * - Synchronisation automatique avec Discord
 * - Gestion des erreurs et validation
 * 
 * Le plus important : quand on crée/modifie/supprime un campus,
 * on doit aussi gérer le rôle Discord associé automatiquement
 */
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

    private readonly campusBotService: CampusBotService, /* Service pour interagir avec Discord */
  ) {}

  /* 
   * Crée un nouveau campus avec son rôle Discord associé
   * 
   * Workflow :
   * 1. Validation des données d'entrée
   * 2. Création du rôle Discord via le bot
   * 3. Sauvegarde du rôle en base
   * 4. Création du campus avec référence au rôle
   * 
   * Si une étape échoue, on remonte l'erreur
   */
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

  /* Récupère tous les campus avec leurs promotions associées */
  findAll() {
    return this.campusRepository.find({ relations: ['promotions'] });
  }

  /* Récupère un campus spécifique par son UUID */
  findOne(uuidCampus: string) {
    if (!uuidCampus) {
      throw new NotFoundException('UUID du campus manquant');
    }
    return this.campusRepository.findOneBy({ uuidCampus });
  }

  /* 
   * Met à jour un campus existant
   * 
   * Si le nom change, on met aussi à jour le rôle Discord
   * pour garder la cohérence entre la base et Discord
   */
  async update(uuidCampus: string, updateCampusDto: UpdateCampusDto) {
    const campus = await this.campusRepository.findOneBy({ uuidCampus });
    if (!campus) {
      throw new NotFoundException(`Campus with UUID "${uuidCampus}" not found`);
    }

    /* Si le nom change, on met à jour le rôle Discord aussi */
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

  /* 
   * Supprime un campus et son rôle Discord associé
   * 
   * Attention : cette opération supprime définitivement le campus
   * et le rôle Discord correspondant
   */
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
