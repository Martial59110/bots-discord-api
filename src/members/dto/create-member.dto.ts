import { IsString, MaxLength, IsInt, Min, Matches, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { PickableDiscordUUIDFields } from 'src/utils/pickable-discord-uuid-fields';

export class CreateMemberDto extends PickType(PickableDiscordUUIDFields, [
  'uuidDiscord',
  'uuidGuild'
]) {
  @ApiProperty({
    description: 'Nom d\'utilisateur du membre dans la guilde',
    example: 'JohnDoe',
    maxLength: 50
  })
  @IsString()
  @MaxLength(50)
  guildUsername: string;

  @ApiProperty({
    description: 'Points d\'expérience du membre',
    example: '100.00',
    required: false,
    default: '0.00'
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d{2}$/, { message: 'xp doit être un nombre décimal avec 2 décimales (ex: 100.00)' })
  xp?: string = '0.00';

  @ApiProperty({
    description: 'Niveau du membre',
    example: 1,
    minimum: 0,
    required: false,
    default: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number = 0;

  @ApiProperty({
    description: 'Rôle communautaire du membre',
    example: 'Member',
    maxLength: 50,
    required: false,
    default: 'Member'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  communityRole?: string = 'Member';

  @ApiProperty({
    description: 'Statut du membre',
    example: 'Active',
    enum: ['Active', 'Inactive', 'Banned'],
    required: false,
    default: 'Active'
  })
  @IsOptional()
  @IsString()
  @IsIn(['Active', 'Inactive', 'Banned'])
  status?: string = 'Active';
}
