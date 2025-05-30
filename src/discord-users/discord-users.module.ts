import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordUsersService } from './discord-users.service';
import { DiscordUsersController } from './discord-users.controller';
import { DiscordUser } from './entities/discord-user.entity';
import { Member } from '../members/entities/member.entity';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordUser, Member]), DiscordBotModule],
  controllers: [DiscordUsersController],
  providers: [DiscordUsersService],
  exports: [DiscordUsersService]
})
export class DiscordUsersModule {} 