import { Controller, Get, Post, Body, Put, Param, Delete, NotFoundException } from '@nestjs/common';
import { CampusesService } from './campuses.service';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Campus } from './entities/campus.entity';

@ApiTags('campuses')
@Controller('campuses')
export class CampusesController {
  constructor(private readonly campusService: CampusesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau campus' })
  @ApiResponse({ status: 201, description: 'Le campus a été créé avec succès.', type: Campus })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  create(@Body() createCampusDto: CreateCampusDto) {
    return this.campusService.create(createCampusDto);
  }

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

  @Get(':uuid')
  @ApiOperation({ summary: 'Récupérer un campus par son UUID' })
  @ApiResponse({ status: 200, description: 'Le campus a été trouvé.', type: Campus })
  @ApiResponse({ status: 404, description: 'Campus non trouvé' })
  findOne(@Param('uuid') uuid: string) {
    return this.campusService.findOne(uuid);
  }

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

  @Delete(':uuid')
  @ApiOperation({ summary: 'Supprimer un campus' })
  @ApiResponse({ status: 200, description: 'Le campus a été supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Campus non trouvé' })
  remove(@Param('uuid') uuid: string) {
    return this.campusService.remove(uuid);
  }
}
