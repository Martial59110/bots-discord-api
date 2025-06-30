import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

/**
 * Module d'authentification qui regroupe tout ce qui concerne la sécurité
 * 
 * Ce module configure :
 * - L'authentification JWT avec Passport
 * - Les tokens JWT avec leur secret et expiration
 * - Les services pour interagir avec Discord OAuth2
 * - Les guards pour protéger les routes
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '24h'),
        },
      }),
    }),
    
    HttpModule,
    
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule, RolesGuard],
})
export class AuthModule {} 