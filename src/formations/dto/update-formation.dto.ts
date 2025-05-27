import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateFormationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channelIds?: string[];
} 