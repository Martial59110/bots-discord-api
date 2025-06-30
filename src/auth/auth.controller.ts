import { Controller, Get, Query, Res, UnauthorizedException, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DiscordGuildMember } from './interfaces/discord-user.interface';
import { Public } from './decorators/public.decorator';

/**
 * Contrôleur qui gère toutes les routes d'authentification
 * 
 * Ce contrôleur expose les endpoints pour :
 * - Démarrer le processus de connexion Discord OAuth2
 * - Recevoir le callback de Discord après authentification
 * - Déconnecter l'utilisateur
 * - Récupérer les infos utilisateur
 * 
 * Toutes les routes sont marquées @Public() car elles doivent être accessibles
 * sans authentification (sinon on ne pourrait jamais se connecter !)
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Point d'entrée pour démarrer la connexion Discord OAuth2
   * 
   * Quand l'utilisateur clique sur "Se connecter avec Discord", il arrive ici.
   * On le redirige vers Discord avec nos paramètres d'app (client_id, scope, etc.)
   */
  @ApiOperation({ 
    summary: 'Connexion via Discord OAuth2',
    description: 'Redirige l\'utilisateur vers la page d\'authentification Discord OAuth2'
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirection vers Discord OAuth2'
  })
  @Get('login')
  @Public()
  login(@Res() res: FastifyReply): void {
    const clientId = this.configService.get<string>('DISCORD_CLIENT_ID') || '';
    const redirectUri = encodeURIComponent(this.configService.get<string>('DISCORD_REDIRECT_URI') || '');
    const scope = encodeURIComponent('identify email guilds guilds.members.read');
    
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    this.logger.log(`Redirection vers Discord: ${discordAuthUrl}`);
    this.logger.log(`URL de redirection non encodée: ${this.configService.get<string>('DISCORD_REDIRECT_URI')}`);
    
    res.status(302).header('Location', discordAuthUrl).send();
  }

  /**
   * Alias pour la route login - certains utilisent /auth/discord au lieu de /auth/login
   */
  @ApiOperation({ 
    summary: 'Redirection vers Discord OAuth2',
    description: 'Alias pour la route login'
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirection vers Discord OAuth2'
  })
  @Get('discord')
  @Public()
  discordLogin(@Res() res: FastifyReply): void {
    return this.login(res);
  }

  /**
   * Endpoint appelé par Discord après que l'utilisateur se soit authentifié
   * 
   * Discord nous renvoie un code temporaire qu'on échange contre un token.
   * On vérifie que l'utilisateur est bien dans notre serveur et a les bons rôles.
   * Si tout est OK, on génère un JWT et on le met dans un cookie sécurisé.
   */
  @ApiOperation({ 
    summary: 'Callback OAuth2 Discord',
    description: 'Endpoint appelé par Discord après authentification réussie'
  })
  @ApiQuery({ 
    name: 'code', 
    required: true, 
    description: 'Code d\'autorisation fourni par Discord'
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirection vers le frontend avec le JWT token'
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non autorisé - code manquant ou utilisateur non membre du serveur autorisé'
  })
  @Get('callback')
  @Public()
  async callback(@Query('code') code: string, @Res() res: FastifyReply): Promise<void> {
    this.logger.log(`Callback reçu avec code: ${code}`);
    
    if (!code) {
      this.logger.error('Code d\'autorisation non fourni');
      throw new UnauthorizedException('Code d\'autorisation non fourni');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';

    // Utilisation de la nouvelle méthode du service qui centralise toute la logique
    const result = await this.authService.processOAuth2Callback(code);
    
    if (result.success && result.jwt) {
      // Configuration du cookie via le service
      const cookieConfig = this.authService.getCookieConfig(result.jwt);
      res.cookie(cookieConfig.name, cookieConfig.value, cookieConfig.options);
      
      const redirectUrl = `${frontendUrl}/auth-callback-page?success=true`;
      this.logger.log(`Redirection vers: ${redirectUrl}`);
      res.status(302).header('Location', redirectUrl).send();
    } else {
      // Redirection vers la page d'erreur
      const redirectUrl = `${frontendUrl}/auth-callback-page?message=${encodeURIComponent(result.errorMessage || 'Erreur inconnue')}`;
      this.logger.log(`Redirection vers page d'erreur: ${redirectUrl}`);
      res.status(302).header('Location', redirectUrl).send();
    }
  }

  /**
   * Déconnecte l'utilisateur en supprimant le cookie d'authentification
   * 
   * On supprime le cookie JWT et on redirige vers la page de login
   */
  @ApiOperation({ 
    summary: 'Déconnexion',
    description: 'Supprime le cookie d\'authentification'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Déconnexion réussie'
  })
  @Get('logout')
  @Public()
  logout(@Res() res: FastifyReply): void {
    // Configuration de suppression du cookie via le service
    const cookieConfig = this.authService.getClearCookieConfig();
    res.clearCookie(cookieConfig.name, cookieConfig.options);
    
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const redirectUrl = `${frontendUrl}/login`;
    
    res.status(302).header('Location', redirectUrl).send();
  }

  /**
   * Endpoint pour récupérer les infos de l'utilisateur connecté
   * 
   * Peut fonctionner de deux façons :
   * - Avec un code OAuth2 (ancien flux)
   * - Avec un JWT valide (nouveau flux)
   * 
   * Retourne les infos utilisateur, ses serveurs, ses rôles, etc.
   */
  @ApiOperation({ 
    summary: 'Informations utilisateur',
    description: 'Récupère les informations de l\'utilisateur authentifié'
  })
  @ApiQuery({ 
    name: 'code', 
    required: false, 
    description: 'Code d\'autorisation fourni par Discord (optionnel si JWT fourni)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Informations utilisateur récupérées avec succès'
  })
  @Get('user-info')
  async getUserInfo(@Query('code') code: string | undefined, @Res() res: FastifyReply): Promise<void> {
    try {
      let user: any;
      let guilds: any[];
      let isInAllowedGuild = false;
      let guildMember: DiscordGuildMember | null = null;
      let roles: string[] = [];

      if (code) {
        // Mode OAuth2 avec code - utilisation de la nouvelle méthode du service
        const oauth2Result = await this.authService.processOAuth2UserInfo(code);
        user = oauth2Result.user;
        guilds = oauth2Result.guilds;
        isInAllowedGuild = oauth2Result.isInAllowedGuild;
        guildMember = oauth2Result.guildMember;
        roles = oauth2Result.roles;
      } else {
        // Mode JWT - utilisation de la nouvelle méthode du service
        const request = res.request as any;
        const jwtUser = request.user;
        
        if (!jwtUser) {
          res.status(401).send({
            message: 'Token JWT manquant ou invalide',
            status: 401
          });
          return;
        }
        
        const jwtResult = this.authService.processJwtUserInfo(jwtUser);
        user = jwtResult.user;
        roles = jwtResult.roles;
        isInAllowedGuild = jwtResult.isInAllowedGuild;
        guilds = jwtResult.guilds;
      }
      
      // Génération du JWT si l'utilisateur est membre du serveur autorisé
      const jwt = isInAllowedGuild 
        ? this.authService.generateJwtToken(user, roles)
        : null;
      
      // Construction de la réponse
      res.status(200).send({
        user: {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          email: user.email
        },
        guilds: guilds.map(guild => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          isOwner: guild.owner
        })),
        allowedGuild: {
          isMember: isInAllowedGuild,
          roles: roles,
          nickname: guildMember?.nick || null
        },
        token: jwt,
        status: 200
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des informations utilisateur: ${error.message}`, error.stack);
      res.status(500).send({
        message: `Erreur: ${error.message}`,
        status: 500
      });
    }
  }
} 