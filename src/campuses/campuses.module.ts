/* 
 * Module principal pour la gestion des campus Simplon
 * 
 * Ce module gère tout ce qui concerne les campus : création, modification, suppression
 * et la synchronisation automatique avec Discord (création de rôles, etc.)
 * 
 * Quand on crée un campus, ça crée automatiquement un rôle Discord correspondant
 * pour que les étudiants puissent être assignés au bon campus
 */
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
    TypeOrmModule.forFeature([Campus, Role]), /* On a besoin de Campus et Role pour la DB */
    DiscordBotModule /* Pour pouvoir créer/modifier les rôles Discord */
  ],
  controllers: [CampusesController], /* Les endpoints API */
  providers: [CampusesService, CampusBotService], /* Les services qui font le boulot */
  exports: [CampusesService] /* On exporte le service principal pour que d'autres modules puissent l'utiliser */
})
export class CampusesModule {}
