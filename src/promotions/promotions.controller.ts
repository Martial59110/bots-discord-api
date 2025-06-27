import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService
  ) {}

  @Post()
  @Roles('admin', 'director', 'project-manager')
  @ApiOperation({ summary: 'Créer une nouvelle promotion' })
  @ApiResponse({ 
    status: 201, 
    description: 'Promotion créée avec succès',
    type: Promotion 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Accès refusé - rôle insuffisant' 
  })
  async create(@Body() createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    // Utiliser directement le service de base sans workflow de suppression automatique
    return this.promotionsService.create(createPromotionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les promotions' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, description: 'Terme de recherche' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des promotions récupérée avec succès',
    type: [Promotion] 
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    // Retourner directement la structure attendue par le frontend
    return this.promotionsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une promotion par son ID' })
  @ApiParam({ name: 'id', description: 'UUID de la promotion' })
  @ApiResponse({ 
    status: 200, 
    description: 'Promotion récupérée avec succès',
    type: Promotion 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Promotion non trouvée' 
  })
  async findOne(@Param('id') id: string): Promise<Promotion> {
    return this.promotionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'director', 'project-manager')
  @ApiOperation({ summary: 'Mettre à jour une promotion' })
  @ApiParam({ name: 'id', description: 'UUID de la promotion' })
  @ApiResponse({ 
    status: 200, 
    description: 'Promotion mise à jour avec succès',
    type: Promotion 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Accès refusé - rôle insuffisant' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Promotion non trouvée' 
  })
  async update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ): Promise<Promotion> {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  @Delete(':id')
  @Roles('admin', 'director', 'project-manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une promotion' })
  @ApiParam({ name: 'id', description: 'UUID de la promotion' })
  @ApiResponse({ 
    status: 204, 
    description: 'Promotion supprimée avec succès' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Accès refusé - rôle insuffisant' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Promotion non trouvée' 
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.promotionsService.remove(id);
  }

  @Post(':uuid_promotion/followers/:uuid_member')
  @ApiOperation({ summary: 'Ajouter un membre comme follower d\'une promotion' })
  @ApiParam({ name: 'uuid_promotion', description: 'UUID de la promotion' })
  @ApiParam({ name: 'uuid_member', description: 'UUID du membre à ajouter comme follower' })
  @ApiResponse({ status: 200, description: 'Le membre a été ajouté comme follower avec succès.', type: Promotion })
  @ApiResponse({ status: 404, description: 'Promotion ou membre non trouvé' })
  @ApiResponse({ status: 400, description: 'Le membre est déjà follower de cette promotion' })
  addFollower(
    @Param('uuid_promotion') uuidPromotion: string,
    @Param('uuid_member') uuidMember: string,
  ) {
    return this.promotionsService.addFollower(uuidPromotion, uuidMember);
  }

  @Post(':uuid_promotion/managers/:uuid_member')
  @ApiOperation({ summary: 'Ajouter un membre comme manager d\'une promotion' })
  @ApiParam({ name: 'uuid_promotion', description: 'UUID de la promotion' })
  @ApiParam({ name: 'uuid_member', description: 'UUID du membre à ajouter comme manager' })
  @ApiResponse({ status: 200, description: 'Le membre a été ajouté comme manager avec succès.', type: Promotion })
  @ApiResponse({ status: 404, description: 'Promotion ou membre non trouvé' })
  @ApiResponse({ status: 400, description: 'Le membre est déjà manager de cette promotion' })
  addManager(
    @Param('uuid_promotion') uuidPromotion: string,
    @Param('uuid_member') uuidMember: string,
  ) {
    return this.promotionsService.addManager(uuidPromotion, uuidMember);
  }

  @Patch(':uuid/position/:position')
  @ApiOperation({ summary: 'Modifier la position de la catégorie d\'une promotion' })
  @ApiResponse({ status: 200, description: 'La position de la catégorie a été modifiée avec succès.', type: Promotion })
  @ApiResponse({ status: 404, description: 'Promotion non trouvée' })
  @ApiResponse({ status: 400, description: 'Position invalide ou promotion sans catégorie' })
  async setCategoryPosition(
    @Param('uuid') uuid: string,
    @Param('position', ParseIntPipe) position: number
  ) {
    return this.promotionsService.setCategoryPosition(uuid, position);
  }

  @Get(':uuid/members')
  async getPromotionMembers(@Param('uuid') uuid: string) {
    const promo = await this.promotionsService.getPromotionMembers(uuid);
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  @Delete(':uuid_promotion/followers/:uuid_member')
  async removeFollower(
    @Param('uuid_promotion') uuidPromotion: string,
    @Param('uuid_member') uuidMember: string,
  ) {
    return this.promotionsService.removeFollower(uuidPromotion, uuidMember);
  }
} 