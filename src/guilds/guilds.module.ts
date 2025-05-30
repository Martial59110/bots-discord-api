import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuildsService } from './guilds.service';
import { GuildsController } from './guilds.controller';
import { Guild } from './entities/guild.entity';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';
import { FormationsModule } from '../formations/formations.module';
import { Member } from '../members/entities/member.entity';
import { Promotion } from '../promotions/entities/promotion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guild, Member, Promotion]),
    DiscordBotModule,
    FormationsModule
  ],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService]
})
export class GuildsModule {}
