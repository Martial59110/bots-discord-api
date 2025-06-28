/* 
 * DTO pour la création d'un nouveau campus
 * 
 * Ce DTO définit les champs requis pour créer un campus :
 * - name : le nom du campus (ex: "Simplon Paris")
 * - uuidGuild : l'ID du serveur Discord où créer le campus
 * - uuidRole : l'ID du rôle Discord (sera généré automatiquement)
 * 
 * On utilise PickType pour ne récupérer que les champs dont on a besoin
 * depuis les types de base PickableDtoFields et PickableDiscordUUIDFields
 */
import { IntersectionType, PickType, PartialType } from '@nestjs/swagger';
import { PickableDtoFields } from 'src/utils/pickable-dto-fields';
import { PickableDiscordUUIDFields } from 'src/utils/pickable-discord-uuid-fields';

export class CreateCampusDto extends PickType(IntersectionType(PickableDtoFields, PartialType(PickableDiscordUUIDFields)), [
  'name',      /* Nom du campus */
  'uuidRole',  /* ID du rôle Discord (généré automatiquement) */
  'uuidGuild'  /* ID du serveur Discord */
]) { 
}
