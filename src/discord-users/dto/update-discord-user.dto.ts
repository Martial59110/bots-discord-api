import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDiscordUserDto } from './create-discord-user.dto';
import { IsString } from 'class-validator';

export class UpdateDiscordUserDto extends PartialType(
  OmitType(CreateDiscordUserDto, ['uuidDiscord'] as const),
) {
  @IsString()
  avatar?: string;
} 