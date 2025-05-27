import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuildsService } from './guilds.service';
import { GuildsController } from './guilds.controller';
import { Guild } from './entities/guild.entity';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guild]),
    DiscordBotModule
  ],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService]
})
export class GuildsModule {}
