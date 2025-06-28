/* 
 * Contrôleur pour la gestion des campus via l'API REST
 * 
 * Ce contrôleur expose tous les endpoints nécessaires pour gérer les campus :
 * - Créer un nouveau campus (avec création automatique du rôle Discord)
 * - Lister tous les campus
 * - Récupérer un campus spécifique
 * - Modifier un campus existant
 * - Supprimer un campus (avec suppression du rôle Discord)
 * 
 * Tous les endpoints sont protégés sauf ceux marqués @Public()
 */
import { Controller, Get, Post, Body, Put, Param, Delete, NotFoundException } from '@nestjs/common';
import { CampusesService } from './campuses.service';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Campus } from './entities/campus.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('campuses')
@Controller('campuses')
export class CampusesController {
  constructor(private readonly campusService: CampusesService) {}

  /* 
   * POST /campuses
   * Crée un nouveau campus et son rôle Discord associé
   * 
   * Quand on crée un campus, le service va automatiquement :
   * 1. Créer le campus en base
   * 2. Créer un rôle Discord avec le même nom
   * 3. Lier le campus au rôle créé
   */
  @Post()
  @ApiOperation({ summary: 'Créer un nouveau campus' })
  @ApiResponse({ status: 201, description: 'Le campus a été créé avec succès.', type: Campus })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  create(@Body() createCampusDto: CreateCampusDto) {
    return this.campusService.create(createCampusDto);
  }

  /* 
   * GET /campuses
   * Récupère la liste de tous les campus
   * 
   * Retourne toujours un objet avec une propriété "data" pour la cohérence API
   */
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les campus' })
  @ApiResponse({ status: 200, description: 'Liste des campus récupérée avec succès.', type: [Campus] })
  async findAll() {
    const campuses = await this.campusService.findAll();
    if (Array.isArray(campuses)) {
      return { data: campuses };
    }
    if (campuses && Array.isArray((campuses as any).data)) {
      return { data: (campuses as any).data };
    }
    return { data: [] };
  }

  /* 
   * GET /campuses/:uuid
   * Récupère un campus spécifique par son UUID
   */
  @Get(':uuid')
  @ApiOperation({ summary: 'Récupérer un campus par son UUID' })
  @ApiResponse({ status: 200, description: 'Le campus a été trouvé.', type: Campus })
  @ApiResponse({ status: 404, description: 'Campus non trouvé' })
  findOne(@Param('uuid') uuid: string) {
    return this.campusService.findOne(uuid);
  }

  /* 
   * PUT /campuses/:uuid
   * Met à jour un campus existant
   * 
   * Si le nom change, le rôle Discord sera aussi mis à jour automatiquement
   */
  @Put(':uuid')
  @ApiOperation({ summary: 'Mettre à jour un campus' })
  @ApiResponse({ status: 200, description: 'Le campus a été mis à jour avec succès.', type: Campus })
  @ApiResponse({ status: 404, description: 'Campus non trouvé' })
  async update(@Param('uuid') uuid: string, @Body() updateCampusDto: UpdateCampusDto) {
    const campus = await this.campusService.update(uuid, updateCampusDto);
    if (!campus) {
      throw new NotFoundException(`Campus with UUID "${uuid}" not found`);
    }
    return campus;
  }

  /* 
   * DELETE /campuses/:uuid
   * Supprime un campus et son rôle Discord associé
   * 
   * Attention : cette opération est irréversible !
   */
  @Delete(':uuid')
  @ApiOperation({ summary: 'Supprimer un campus' })
  @ApiResponse({ status: 200, description: 'Le campus a été supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Campus non trouvé' })
  remove(@Param('uuid') uuid: string) {
    return this.campusService.remove(uuid);
  }
}
