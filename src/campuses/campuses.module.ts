import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampusesService } from './campuses.service';
import { CampusesController } from './campuses.controller';
import { Campus } from './entities/campus.entity';
import { Role } from '../roles/entities/role.entity';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { CampusBotService } from './campus-bot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campus, Role]),
    DiscordBotModule
  ],
  controllers: [CampusesController],
  providers: [CampusesService, CampusBotService],
  exports: [CampusesService]
})
export class CampusesModule {}
