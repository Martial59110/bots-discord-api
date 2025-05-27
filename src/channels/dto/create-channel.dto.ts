import { IsString, IsInt, IsEnum, MaxLength, Min, Length, IsOptional } from 'class-validator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { PickableDiscordUUIDFields } from 'src/utils/pickable-discord-uuid-fields';

enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice',
  ANNOUNCEMENT = 'announcement',
  FORUM = 'forum'
}

export class CreateChannelDto extends PickType(PickableDiscordUUIDFields, [
  'uuidGuild'
]) {
  @ApiProperty({
    description: 'ID Discord du channel',
    example: '123456789012345678'
  })
  @IsString()
  @Length(17, 19)
  uuid: string;

  @ApiProperty({
    description: 'Le nom du channel',
    example: 'général',
    maxLength: 100
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Le type de channel',
    example: 'text',
    enum: ChannelType
  })
  @IsString()
  @IsEnum(ChannelType)
  type: string;

  @ApiProperty({
    description: 'La position du channel',
    example: 1,
    minimum: 0
  })
  @IsInt()
  @Min(0)
  channelPosition: number;

  @ApiProperty({
    description: 'ID Discord de la catégorie associée',
    example: '123456789012345678',
    required: false
  })
  @IsOptional()
  @IsString()
  @Length(17, 19)
  uuidCategory?: string;

  uuidGuild: string;
} 