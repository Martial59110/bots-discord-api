import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { Promotion } from './entities/promotion.entity';
import { RolesModule } from 'src/roles/roles.module';
import { Member } from 'src/members/entities/member.entity';
import { FormationsModule } from '../formations/formations.module';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion, Member]), 
    RolesModule,
    FormationsModule,
    DiscordBotModule
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService]
})
export class PromotionsModule {} 