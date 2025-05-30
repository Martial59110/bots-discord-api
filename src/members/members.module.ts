import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { RolesModule } from 'src/roles/roles.module';
import { Role } from '../roles/entities/role.entity';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { DiscordModule } from '../discord/discord.module';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Role, DiscordUser]),
    DiscordModule,
    DiscordBotModule
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService]
})
export class MembersModule {}
