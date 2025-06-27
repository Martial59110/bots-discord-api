import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { PromotionsService } from './promotions.service';
import { PromotionsBotService } from './promotions-bot.service';
import { FormationsService } from '../formations/formations.service';
import { ChannelsService } from '../channels/channels.service';
import { RolesService } from '../roles/roles.service';
import { CampusesService } from '../campuses/campuses.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class PromotionLifecycleService {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly promotionsBotService: PromotionsBotService,
    private readonly formationsService: FormationsService,
    private readonly channelsService: ChannelsService,
    private readonly rolesService: RolesService,
    private readonly campusesService: CampusesService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('PromotionLifecycleService');
  }

  // RG49-54 : Workflow métier de création de promotion
  async createPromotionWithWorkflow(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    this.logger.info('Début du workflow de création de promotion', createPromotionDto);
    
    try {
      // RG49 : Validation de l'ordre (formation → campus → nom)
      await this.validatePromotionCreationOrder(createPromotionDto);
      
      // RG57-58 : Validation des relations obligatoires
      await this.validatePromotionRelations(createPromotionDto);
      
      // RG60 : Vérification de la cohérence campus-formation
      await this.validateCampusFormationCompatibility(createPromotionDto);
      
      // Création de la promotion avec le système existant (qui gère déjà Discord)
      const promotion = await this.promotionsService.create(createPromotionDto);
      
      // RG54 : Le rôle et les channels sont déjà créés par le système existant
      this.logger.info(`Promotion créée avec rôle Discord: ${promotion.uuidRole} et catégorie: ${promotion.uuidCategory}`);
      
      // RG48 : Message de confirmation
      await this.sendCreationConfirmation(promotion);
      
      // RG55-56 : Programmation de la suppression automatique
      await this.schedulePromotionDeletion(promotion);
      
      this.logger.info(`Promotion ${promotion.name} créée avec succès et workflow métier appliqué`);
      return promotion;
      
    } catch (error) {
      this.logger.error('Erreur dans le workflow de création de promotion', error);
      throw error;
    }
  }

  // RG49 : Validation de l'ordre de création
  private async validatePromotionCreationOrder(dto: CreatePromotionDto): Promise<void> {
    if (!dto.uuidFormation) {
      throw new BadRequestException('Il faut d\'abord sélectionner une formation');
    }
    if (!dto.uuidCampus) {
      throw new BadRequestException('Il faut ensuite sélectionner un campus');
    }
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Il faut enfin renseigner le nom de la promotion');
    }
  }

  // RG57-58 : Validation des relations obligatoires
  private async validatePromotionRelations(dto: CreatePromotionDto): Promise<void> {
    if (!dto.uuidCampus) {
      throw new BadRequestException('Une promotion doit être liée à un campus');
    }
    if (!dto.uuidFormation) {
      throw new BadRequestException('Une promotion doit être liée à une formation');
    }
  }

  // RG60 : Vérification de la cohérence campus-formation
  private async validateCampusFormationCompatibility(dto: CreatePromotionDto): Promise<void> {
    try {
      const campus = await this.campusesService.findOne(dto.uuidCampus);
      const formation = await this.formationsService.findOne(dto.uuidFormation);
      
      // Logique métier : vérifier si la formation est compatible avec le campus
      if (!this.isFormationCompatibleWithCampus(formation, campus)) {
        throw new BadRequestException('Cette formation n\'est pas compatible avec ce campus');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Campus ou formation non trouvé');
      }
      throw error;
    }
  }

  // Logique métier pour la compatibilité campus-formation
  private isFormationCompatibleWithCampus(formation: any, campus: any): boolean {
    // Pour l'instant, on considère que toutes les formations sont compatibles avec tous les campus
    // Cette logique peut être étendue selon les besoins métier
    return true;
  }

  
  // RG55-56 : Programmation de la suppression automatique
  private async schedulePromotionDeletion(promotion: Promotion): Promise<void> {
    this.logger.info('Date de fin de la promotion : ' + promotion.endDate);
    const deletionConfig = await this.calculateDeletionConfig(promotion);
    this.logger.info('Date de suppression calculée : ' + deletionConfig.deletionDate);
    this.logger.info('Date de notification calculée : ' + deletionConfig.notificationDate);
    this.logger.info('Délai de suppression : ' + deletionConfig.delay);
    
    // Vérifier que la date de suppression est dans le futur
    const now = new Date();
    const timeUntilDeletion = deletionConfig.deletionDate.getTime() - now.getTime();
    
    if (timeUntilDeletion <= 0) {
      this.logger.warn(`La date de suppression (${deletionConfig.deletionDate}) est dans le passé ou maintenant. Suppression automatique désactivée.`);
      return;
    }
    
    await this.scheduleDeletionTasks(promotion.uuid_promotion, deletionConfig);
    this.logDeletionSchedule(promotion.name, deletionConfig.deletionDate);
  }

  // S - Single Responsibility : Calcule uniquement la configuration de suppression
  private async calculateDeletionConfig(promotion: Promotion): Promise<{
    deletionDate: Date;
    notificationDate: Date;
    delay: string;
  }> {
    const formation = await this.formationsService.findOne(promotion.uuidFormation);
    const deletionDelay = this.getDeletionDelay(formation);
    
    const deletionDate = this.calculateDeletionDate(promotion.endDate, deletionDelay);
    const notificationDate = this.calculateNotificationDate(promotion.endDate);
    const delay = this.formatDelay(deletionDelay);
    
    return { deletionDate, notificationDate, delay };
  }

  //si diplomante 3 mois sinon 1 mois//
  private getDeletionDelay(formation: any): number {
    return (formation && (formation as any).isDiplomante) ? 3 : 1;
  }

  //calcule date de suppression//
  private calculateDeletionDate(endDate: Date, delayMonths: number): Date {
    const deletionDate = new Date(endDate);
    deletionDate.setMonth(deletionDate.getMonth() + delayMonths);
    return deletionDate;
  }

  // notif 7 jours avant//
  private calculateNotificationDate(endDate: Date): Date {
    const notificationDate = new Date(endDate);
    notificationDate.setDate(notificationDate.getDate() - 7);
    
    // Si la date de notification est dans le passé, la programmer pour demain
    const now = new Date();
    if (notificationDate.getTime() <= now.getTime()) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.logger.warn(`Date de notification dans le passé, reprogrammée pour demain: ${tomorrow}`);
      return tomorrow;
    }
    
    return notificationDate;
  }

  // S - Single Responsibility : Formate uniquement le délai pour l'affichage
  private formatDelay(delayMonths: number): string {
    return delayMonths === 3 ? '3 mois' : '1 mois';
  }

  // S - Single Responsibility : Programme uniquement les tâches
  private async scheduleDeletionTasks(promotionUuid: string, config: {
    deletionDate: Date;
    notificationDate: Date;
  }): Promise<void> {
    await this.scheduleNotification(promotionUuid, config.notificationDate);
    await this.scheduleDeletion(promotionUuid, config.deletionDate);
  }

  // S - Single Responsibility : Log uniquement le planning
  private logDeletionSchedule(promotionName: string, deletionDate: Date): void {
    this.logger.info(`Promotion ${promotionName} programmée pour suppression le ${deletionDate.toISOString()}`);
  }

  // RG56 : Notification automatique
  private async scheduleNotification(promotionUuid: string, notificationDate: Date): Promise<void> {
    const delay = notificationDate.getTime() - Date.now();
    
    if (delay > 0) {
      this.logger.info(`Notification programmée pour ${promotionUuid} dans ${delay}ms (${Math.round(delay / 1000 / 60)} minutes)`);
      setTimeout(async () => {
        await this.sendDeletionWarning(promotionUuid);
      }, delay);
    } else {
      this.logger.warn(`La date de notification (${notificationDate}) est dans le passé. Notification annulée.`);
    }
  }

  // RG55 : Suppression automatique
  private async scheduleDeletion(promotionUuid: string, deletionDate: Date): Promise<void> {
    const delay = deletionDate.getTime() - Date.now();
    
    if (delay > 0) {
      this.logger.info(`Suppression programmée pour ${promotionUuid} dans ${delay}ms (${Math.round(delay / 1000 / 60 / 60)} heures)`);
      setTimeout(async () => {
        await this.deletePromotionAutomatically(promotionUuid);
      }, delay);
    } else {
      this.logger.warn(`La date de suppression (${deletionDate}) est dans le passé. Suppression annulée.`);
    }
  }

  // RG56 : Envoi de l'avertissement
  private async sendDeletionWarning(promotionUuid: string): Promise<void> {
    try {
      const promotion = await this.promotionsService.findOne(promotionUuid);
      const formation = await this.formationsService.findOne(promotion.uuidFormation);
      
      const delay = this.formatDelay(this.getDeletionDelay(formation));
      const message = this.createWarningMessage(promotion.name, delay);
      
      await this.sendMessageToPromotionChannel(promotion.uuidCategory, message);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'avertissement pour la promotion ${promotionUuid}`, error);
    }
  }

  // S - Single Responsibility : Crée uniquement le message d'avertissement
  private createWarningMessage(promotionName: string, delay: string): string {
    return `⚠️ **ATTENTION** ⚠️\n\nLa promotion **${promotionName}** se termine dans une semaine.\nElle sera supprimée automatiquement dans ${delay}.`;
  }

  // RG55 : Suppression automatique
  private async deletePromotionAutomatically(promotionUuid: string): Promise<void> {
    this.logger.info(`Suppression automatique de la promotion ${promotionUuid}`);
    
    try {
      await this.promotionsService.remove(promotionUuid);
      this.logger.info(`Promotion ${promotionUuid} supprimée automatiquement`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression automatique de la promotion ${promotionUuid}`, error);
    }
  }

  // RG48 : Message de confirmation
  private async sendCreationConfirmation(promotion: Promotion): Promise<void> {
    const message = this.createConfirmationMessage(promotion);
    await this.sendMessageToAdminChannel(promotion.uuidGuild, message);
  }

  // S - Single Responsibility : Crée uniquement le message de confirmation
  private createConfirmationMessage(promotion: Promotion): string {
    return `✅ **Promotion créée avec succès !**\n\n**${promotion.name}** a été créée et est maintenant disponible.\n\n📅 **Période :** ${promotion.startDate.toLocaleDateString()} - ${promotion.endDate.toLocaleDateString()}`;
  }

  // Méthodes utilitaires pour l'envoi de messages
  private async sendMessageToPromotionChannel(categoryId: string, message: string): Promise<void> {
    // TODO: Implémenter l'envoi de message dans le channel général de la promotion
    this.logger.info(`Message envoyé au channel de promotion ${categoryId}: ${message}`);
  }

  private async sendMessageToAdminChannel(guildId: string, message: string): Promise<void> {
    // TODO: Implémenter l'envoi de message dans le channel admin
    this.logger.info(`Message envoyé au channel admin ${guildId}: ${message}`);
  }
} 