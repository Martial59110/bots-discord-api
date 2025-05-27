import { Module } from '@nestjs/common';
import { SignatureController } from './signature.controller';
import { SignatureService } from './signature.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { MembersModule } from '../members/members.module';
import { RolesModule } from '../roles/roles.module';
import { GuildsModule } from '../guilds/guilds.module';
import { ChannelsModule } from '../channels/channels.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Member } from '../members/entities/member.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Role } from '../roles/entities/role.entity';
import { Category } from '../categories/entities/category.entity';
import { DiscordUsersModule } from '../discord-users/discord-users.module';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      Member,
      Channel,
      Role,
      Category,
      DiscordUser
    ]),
    PromotionsModule,
    MembersModule,
    RolesModule,
    GuildsModule,
    ChannelsModule,
    DiscordUsersModule
  ],
  controllers: [SignatureController],
  providers: [SignatureService],
  exports: [SignatureService]
})
export class SignatureModule {} 