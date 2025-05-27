import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormationsService } from './formations.service';
import { FormationsController } from './formations.controller';
import { Formation } from './entities/formation.entity';
import { Role } from '../roles/entities/role.entity';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { ChannelsModule } from '../channels/channels.module';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import { CategoriesModule } from '../categories/categories.module';
import { ThreadTemplate } from './entities/thread-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formation, Role, Category, Channel, ThreadTemplate]),
    DiscordBotModule,
    ChannelsModule,
    CategoriesModule
  ],
  controllers: [FormationsController],
  providers: [FormationsService],
  exports: [FormationsService]
})
export class FormationsModule {} 