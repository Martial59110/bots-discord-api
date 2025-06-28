import { Controller, Get, Query, Res, UnauthorizedException, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DiscordGuildMember } from './interfaces/discord-user.interface';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

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
    
    // Utiliser la méthode de redirection de Fastify
    res.status(302).header('Location', discordAuthUrl).send();
  }

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

    try {
      // Échanger le code contre un token d'accès
      this.logger.log('Échange du code contre un token d\'accès...');
      const accessToken = await this.authService.exchangeCodeForToken(code);
      
      // Récupérer les informations de l'utilisateur
      this.logger.log('Récupération des informations utilisateur...');
      const user = await this.authService.getUserInfo(accessToken);
      
      // Valider l'appartenance au serveur et récupérer les rôles
      this.logger.log(`Validation de l'appartenance au serveur pour l'utilisateur ${user.id}...`);
      const { isValid, roles, guildMember } = await this.authService.validateUserGuild(accessToken, user.id);
      
      if (!isValid) {
        this.logger.warn(`L'utilisateur ${user.id} n'est pas membre du serveur autorisé`);
        const redirectUrl = `${frontendUrl}/auth-callback-page?message=${encodeURIComponent("L'utilisateur n'est pas membre du serveur autorisé")}`;
        res.status(302).header('Location', redirectUrl).send();
        return;
      }

      // Vérification des rôles par nom
      // On récupère la liste complète des rôles du serveur via l'API Discord
      const guildId = this.configService.get<string>('ALLOWED_GUILD_ID') || '';
      const allRolesResponse = await this.authService.getGuildRoles(guildId);
      // allRolesResponse = tableau d'objets { id, name }
      const userRoleNames = allRolesResponse
        .filter(role => guildMember?.roles.includes(role.id))
        .map(role => role.name);
      const allowedRoleNames = ['Administrateur', 'Chargé de projet', 'Directeur'];
      const hasAllowedRole = userRoleNames.some(name => allowedRoleNames.includes(name));
      if (!hasAllowedRole) {
        this.logger.warn(`L'utilisateur ${user.id} n'a pas les rôles requis : ${userRoleNames.join(', ')}`);
        const redirectUrl = `${frontendUrl}/auth-callback-page?message=${encodeURIComponent("Vous n'avez pas les permissions nécessaires pour accéder à cette application.")}`;
        res.status(302).header('Location', redirectUrl).send();
        return;
      }
      
      // Générer un JWT
      this.logger.log('Génération du JWT...');
      const jwt = this.authService.generateJwtToken(user, roles);
      
      // Définir le JWT dans un cookie httpOnly
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', jwt, {
        httpOnly: true,
        secure: isProduction, // HTTPS seulement en production
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        domain: isProduction ? undefined : 'localhost' // Pour le développement local
      });
      
      // Rediriger vers la page de callback du frontend (sans token en paramètre)
      const redirectUrl = `${frontendUrl}/auth-callback-page?success=true`;
      this.logger.log(`Redirection vers: ${redirectUrl}`);
      res.status(302).header('Location', redirectUrl).send();
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du callback: ${error.message}`, error.stack);
      const redirectUrl = `${frontendUrl}/auth-callback-page?message=${encodeURIComponent(error.message)}`;
      this.logger.log(`Redirection vers page d'erreur: ${redirectUrl}`);
      res.status(302).header('Location', redirectUrl).send();
    }
  }

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
    // Supprimer le cookie d'authentification
    res.clearCookie('auth_token', {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
    });
    
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const redirectUrl = `${frontendUrl}/login`;
    
    res.status(302).header('Location', redirectUrl).send();
  }

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
        // Mode avec code OAuth2 (ancien flux)
        this.logger.log('Mode OAuth2 avec code');
        
      // Échanger le code contre un token d'accès
      const accessToken = await this.authService.exchangeCodeForToken(code);
      
      // Récupérer les informations de l'utilisateur
        user = await this.authService.getUserInfo(accessToken);
      
      // Récupérer les serveurs de l'utilisateur
        guilds = await this.authService.getUserGuilds(accessToken);
      
      // Vérifier l'appartenance au serveur autorisé
      const allowedGuildId = this.configService.get<string>('ALLOWED_GUILD_ID') || '';
        isInAllowedGuild = guilds.some(guild => guild.id === allowedGuildId);
      
      if (isInAllowedGuild) {
        try {
          // Récupérer les informations du membre dans le serveur autorisé
            guildMember = await this.authService.getGuildMember(user.id, accessToken);
          roles = guildMember.roles;
        } catch (error) {
          this.logger.error(`Erreur lors de la récupération des informations du membre: ${error.message}`);
        }
        }
      } else {
        // Mode avec JWT (nouveau flux)
        this.logger.log('Mode JWT - récupération des informations depuis le token');
        
        // Les informations utilisateur sont déjà dans le JWT, on les récupère depuis la requête
        const request = res.request as any;
        const jwtUser = request.user;
        
        if (!jwtUser) {
          res.status(401).send({
            message: 'Token JWT manquant ou invalide',
            status: 401
          });
          return;
        }
        
        user = {
          id: jwtUser.userId || jwtUser.sub,
          username: jwtUser.username,
          discriminator: '0000', // Pas disponible dans le JWT
          avatar: null, // Pas disponible dans le JWT
          email: null // Pas disponible dans le JWT
        };
        
        roles = jwtUser.roles || [];
        isInAllowedGuild = true; // Si on a un JWT valide, c'est qu'il est membre
        guilds = []; // Pas de liste des serveurs en mode JWT
      }
      
      // Générer un JWT si l'utilisateur est membre du serveur autorisé
      const jwt = isInAllowedGuild 
        ? this.authService.generateJwtToken(user, roles)
        : null;
      
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