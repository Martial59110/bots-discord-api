import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampusesService } from './campuses.service';
import { CampusesController } from './campuses.controller';
import { Campus } from './entities/campus.entity';
import { Role } from '../roles/entities/role.entity';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campus, Role]),
    DiscordBotModule
  ],
  controllers: [CampusesController],
  providers: [CampusesService],
  exports: [CampusesService]
})
export class CampusesModule {}
