import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionsService } from './promotions.service';
import { PromotionLifecycleService } from './promotion-lifecycle.service';
import { PromotionsController } from './promotions.controller';
import { Promotion } from './entities/promotion.entity';
import { Role } from '../roles/entities/role.entity';
import { Member } from '../members/entities/member.entity';
import { Category } from '../categories/entities/category.entity';
import { FormationsModule } from '../formations/formations.module';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { PromotionsBotService } from './promotions-bot.service';
import { CampusesModule } from '../campuses/campuses.module';
import { ChannelsModule } from '../channels/channels.module';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion, Role, Member, Category]),
    FormationsModule,
    DiscordBotModule,
    CampusesModule,
    ChannelsModule,
    RolesModule,
    AuthModule,
    MembersModule,
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService, PromotionLifecycleService, PromotionsBotService],
  exports: [PromotionsService, PromotionLifecycleService]
})
export class PromotionsModule {} 