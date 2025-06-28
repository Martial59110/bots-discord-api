/* 
 * DTO pour la mise à jour d'un campus existant
 * 
 * Ce DTO hérite de CreateCampusDto mais rend tous les champs optionnels
 * grâce à PartialType. Ça permet de mettre à jour seulement certains champs
 * sans avoir à fournir toutes les données.
 * 
 * Exemple : on peut changer juste le nom sans toucher au serveur Discord
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateCampusDto } from './create-campus.dto';

export class UpdateCampusDto extends PartialType(CreateCampusDto) {
    
}
