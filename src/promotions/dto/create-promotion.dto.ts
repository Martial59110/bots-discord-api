import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsUUID, IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { PickableDtoFields } from 'src/utils/pickable-dto-fields';
import { PickableDiscordUUIDFields } from 'src/utils/pickable-discord-uuid-fields';
import { PickableInternUUIDFields } from 'src/utils/pickable-intern-uuid-fields';

export class CreatePromotionDto extends PickType(PickableDtoFields, [
  'name',
]) {
  @ApiProperty({ description: 'UUID du serveur Discord' })
  @IsString()
  uuidGuild: string;

  @ApiProperty({ description: 'Date de début de la promotion' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, {
    message: 'La date de début doit être au format ISO 8601'
  })
  startDate: string;

  @ApiProperty({ description: 'Date de fin de la promotion' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, {
    message: 'La date de fin doit être au format ISO 8601'
  })
  endDate: string;

  @ApiProperty({ description: 'UUID de la formation associée' })
  @IsUUID()
  uuidFormation: string;

  @ApiProperty({ description: 'Statut de la promotion', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'UUID de la catégorie Discord associée', required: false })
  @IsOptional()
  @IsString()
  @MinLength(17)
  @Matches(/^[0-9]+$/)
  uuidCategory?: string;

  @ApiProperty({ description: 'UUID du rôle Discord associé', required: false })
  @IsOptional()
  @IsString()
  @MinLength(17)
  @Matches(/^[0-9]+$/)
  uuidRole?: string;

  @ApiProperty({
    description: 'UUID du campus associé',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true
  })
  @IsUUID()
  uuidCampus: string;

  @ApiProperty({ description: 'UUID du cours associé', required: false })
  @IsOptional()
  @IsUUID()
  uuidCourse?: string;
} 