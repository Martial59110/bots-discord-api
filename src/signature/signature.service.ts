import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PromotionsService } from '../promotions/promotions.service';
import { MembersService } from '../members/members.service';
import { RolesService } from '../roles/roles.service';
import { GuildsService } from '../guilds/guilds.service';
import { ChannelsService } from '../channels/channels.service';
import { DiscordUsersService } from '../discord-users/discord-users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Member } from '../members/entities/member.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Role } from '../roles/entities/role.entity';
import { Category } from '../categories/entities/category.entity';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';
import { v4 as uuidv4 } from 'uuid';
import { PromotionSignatureDto, MembreDto, PromotionsSignatureResponseDto, RoleDto } from './dto/promotion-signature.dto';

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly membersService: MembersService,
    private readonly rolesService: RolesService,
    private readonly guildsService: GuildsService,
    private readonly channelsService: ChannelsService,
    private readonly discordUsersService: DiscordUsersService,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(DiscordUser)
    private discordUserRepository: Repository<DiscordUser>,
  ) {}

  /**
   * Récupère toutes les promotions avec leurs signatures depuis la base de données
   */
  async getAllPromotions(): Promise<PromotionsSignatureResponseDto> {
    let promotions = await this.promotionRepository.find({
      relations: ['category', 'followers', 'managers', 'role'],
    });

    return {
      promotions: promotions.map(promotion => this.mapPromotionToDto(promotion)),
    };
  }

  /**
   * Récupère une promotion spécifique par son UUID
   */
  async getPromotionSignature(uuid: string): Promise<PromotionSignatureDto> {
    const promotion = await this.promotionRepository.findOne({
      where: { uuid },
      relations: ['category', 'followers', 'managers', 'role'],
    });

    if (!promotion) {
      throw new Error(`Promotion with UUID ${uuid} not found`);
    }

    return this.mapPromotionToDto(promotion);
  }

  /**
   * Convertit une entité Promotion en DTO de signature
   */
  private mapPromotionToDto(promotion: Promotion): PromotionSignatureDto {
    // Filtrer les membres par rôle community
    const projectManager = promotion.managers?.find(member => member.communityRole === 'ProjectManager');
    const trainers = promotion.managers?.filter(member => member.communityRole === 'Trainer') || [];
    const learners = promotion.followers?.filter(member => member.communityRole === 'Learner') || [];

    // Rôles par défaut pour la démo
    const defaultRoles = (roleType: string, promoName: string): RoleDto[] => {
      const roles: RoleDto[] = [];
      
      // Rôle de type (apprenant, formateur, cdp)
      if (roleType) {
        roles.push({
          id: roleType === 'apprenant' ? '1344616774402052126' : 
              roleType === 'formateur' ? '1344616774402052129' : '1344616774402052127',
          nom: roleType
        });
      }
      
      // Rôle de la promotion (slug du nom)
      if (promoName) {
        const slug = promoName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        roles.push({
          id: `1344616774402052128`, // ID générique pour la démo
          nom: slug
        });
      }
      
      return roles;
    };

    // Créer un DTO pour le channel/forum (s'il existe)
    const channel = promotion.category ? 
      { 
        snowflake: promotion.category.uuid, 
        nom: promotion.category.name 
      } : 
      { 
        snowflake: "000000000000000000", 
        nom: `Forum de ${promotion.name}` 
      };

    // Créer un objet chargeDeProjet par défaut si aucun n'existe
    const defaultChargeDeProjet: MembreDto = {
      snowflake: projectManager?.uuidDiscord || "000000000000000000",
      nom: projectManager?.guildUsername || "Chargé de projet non assigné",
      roles: defaultRoles('cdp', promotion.name)
    };

    return {
      uuid: promotion.uuid,
      nom: promotion.name,
      channel,
      chargeDeProjet: projectManager ? {
        snowflake: projectManager.uuidDiscord,
        nom: projectManager.guildUsername,
        roles: defaultRoles('cdp', promotion.name)
      } : defaultChargeDeProjet,
      formateurs: trainers.map(trainer => ({
        snowflake: trainer.uuidDiscord,
        nom: trainer.guildUsername,
        roles: defaultRoles('formateur', promotion.name)
      })),
      apprenants: learners.map(learner => ({
        snowflake: learner.uuidDiscord,
        nom: learner.guildUsername,
        roles: defaultRoles('apprenant', promotion.name)
      }))
    };
  }
} 