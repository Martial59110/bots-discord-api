import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsUUID, IsString, IsOptional, MinLength, Matches, IsNumber, Min } from 'class-validator';
import { CreatePromotionDto } from './create-promotion.dto';

export class UpdatePromotionDto extends PartialType(OmitType(CreatePromotionDto, ['uuidGuild', 'uuidFormation'] as const)) {
  @ApiProperty({ description: 'Nom de la promotion', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Date de début de la promotion', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ description: 'Date de fin de la promotion', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ description: 'Statut de la promotion', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Position de la catégorie dans le serveur', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;
} 