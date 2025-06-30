import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DiscordUser, DiscordGuild, DiscordGuildMember } from './interfaces/discord-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * Service qui gère toute la logique d'authentification avec Discord
 * 
 * Ce service fait le pont entre notre app et l'API Discord pour :
 * - Échanger les codes OAuth2 contre des tokens
 * - Récupérer les infos des utilisateurs
 * - Vérifier les permissions et rôles
 * - Générer nos propres tokens JWT
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly discordApiUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly allowedGuildId: string;
  private readonly botToken: string;
  private readonly allowedRoleNames: string[] = ['Administrateur', 'Chargé de projet', 'Directeur'];

  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.discordApiUrl = this.configService.get<string>('DISCORD_API_ENDPOINT', 'https://discord.com/api/v10');
    this.clientId = this.configService.get<string>('DISCORD_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('DISCORD_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get<string>('DISCORD_REDIRECT_URI') || '';
    this.allowedGuildId = this.configService.get<string>('ALLOWED_GUILD_ID') || '';
    this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN') || '';
    
    this.logger.log(`Configuration initialisée:`);
    this.logger.log(`Discord API URL: ${this.discordApiUrl}`);
    this.logger.log(`Client ID: ${this.clientId}`);
    this.logger.log(`Redirect URI: ${this.redirectUri}`);
    this.logger.log(`Allowed Guild ID: ${this.allowedGuildId}`);
    this.logger.log(`Bot Token configuré: ${this.botToken ? 'Oui' : 'Non'}`);
  }

  /**
   * Échange le code OAuth2 reçu de Discord contre un vrai token d'accès
   * 
   * C'est la première étape du flow OAuth2 : Discord nous donne un code temporaire,
   * on l'échange contre un token qu'on peut utiliser pour appeler l'API Discord
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      this.logger.log(`Échange du code contre un token pour le code: ${code}`);
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      });
      
      this.logger.debug(`Paramètres de la requête: ${params.toString()}`);
      
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          `${this.discordApiUrl}/oauth2/token`,
          params,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.logger.debug(`Réponse reçue du serveur Discord: ${JSON.stringify(tokenResponse.data)}`);
      return tokenResponse.data.access_token;
    } catch (error) {
      this.logger.error(`Erreur lors de l'échange du code contre un token: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(`Réponse d'erreur: ${JSON.stringify(error.response.data)}`);
        this.logger.error(`Status code: ${error.response.status}`);
      }
      throw new BadRequestException(`Échec de l'échange du code: ${error.message}`);
    }
  }

  /**
   * Récupère les infos de base de l'utilisateur (nom, avatar, etc.)
   * 
   * Utilise le token d'accès pour appeler l'endpoint /users/@me de Discord
   */
  async getUserInfo(accessToken: string): Promise<DiscordUser> {
    try {
      const userResponse = await firstValueFrom(
        this.httpService.get(`${this.discordApiUrl}/users/@me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return userResponse.data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des informations utilisateur: ${error.message}`);
      throw new UnauthorizedException('Impossible de récupérer les informations utilisateur');
    }
  }

  /**
   * Récupère la liste de tous les serveurs Discord où l'utilisateur est membre
   * 
   * Ça nous permet de vérifier s'il est bien dans notre serveur autorisé
   */
  async getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    try {
      const guildsResponse = await firstValueFrom(
        this.httpService.get(`${this.discordApiUrl}/users/@me/guilds`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return guildsResponse.data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des serveurs: ${error.message}`);
      throw new UnauthorizedException('Impossible de récupérer les serveurs de l\'utilisateur');
    }
  }

  /**
   * Récupère les infos détaillées d'un membre dans un serveur spécifique
   * 
   * On peut utiliser soit le token OAuth2 de l'utilisateur (si il a les bonnes permissions),
   * soit le token de notre bot comme fallback. Ça nous donne les rôles, le nickname, etc.
   */
  async getGuildMember(userId: string, accessToken?: string, guildId: string = this.allowedGuildId): Promise<DiscordGuildMember> {
    try {
      if (accessToken) {
        try {
          this.logger.log(`Tentative de récupération des informations du membre avec le token d'accès OAuth2`);
          const memberResponse = await firstValueFrom(
            this.httpService.get(`${this.discordApiUrl}/users/@me/guilds/${guildId}/member`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }),
          );
          return memberResponse.data;
        } catch (error) {
          this.logger.warn(`Échec de la récupération avec OAuth2: ${error.message}. Tentative avec le token de bot...`);
        }
      }
      
      if (!this.botToken) {
        throw new Error('DISCORD_BOT_TOKEN n\'est pas défini dans les variables d\'environnement');
      }
      
      this.logger.log(`Récupération des informations du membre avec le token de bot`);
      const memberResponse = await firstValueFrom(
        this.httpService.get(`${this.discordApiUrl}/guilds/${guildId}/members/${userId}`, {
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
        }),
      );

      return memberResponse.data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des informations du membre: ${error.message}`);
      if (error.response?.status === 404) {
        throw new UnauthorizedException('L\'utilisateur n\'est pas membre du serveur spécifié');
      }
      throw new UnauthorizedException('Impossible de récupérer les informations du membre');
    }
  }

  /**
   * Vérifie si l'utilisateur est bien dans notre serveur autorisé et récupère ses rôles
   * 
   * C'est la validation principale : on vérifie d'abord qu'il est dans le bon serveur,
   * puis on récupère ses rôles pour voir s'il a les permissions nécessaires
   */
  async validateUserGuild(accessToken: string, userId: string): Promise<{ isValid: boolean; roles: string[]; guildMember: DiscordGuildMember | null }> {
    const guilds = await this.getUserGuilds(accessToken);
    
    const isInGuild = guilds.some(guild => guild.id === this.allowedGuildId);
    
    if (!isInGuild) {
      return { isValid: false, roles: [], guildMember: null };
    }
    
    try {
      const guildMember = await this.getGuildMember(userId, accessToken);
      
      return { 
        isValid: true, 
        roles: guildMember.roles,
        guildMember: guildMember
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la validation du serveur: ${error.message}`);
      return { 
        isValid: true, 
        roles: [],
        guildMember: null
      };
    }
  }

  /**
   * Vérifie si l'utilisateur a les rôles requis pour accéder à l'application
   * 
   * Compare les rôles de l'utilisateur avec la liste des rôles autorisés
   */
  async validateUserRoles(guildMember: DiscordGuildMember | null): Promise<{ hasAllowedRole: boolean; userRoleNames: string[] }> {
    if (!guildMember) {
      return { hasAllowedRole: false, userRoleNames: [] };
    }

    try {
      const allRolesResponse = await this.getGuildRoles(this.allowedGuildId);
      const userRoleNames = allRolesResponse
        .filter(role => guildMember.roles.includes(role.id))
        .map(role => role.name);
      
      const hasAllowedRole = userRoleNames.some(name => this.allowedRoleNames.includes(name));
      
      return { hasAllowedRole, userRoleNames };
    } catch (error) {
      this.logger.error(`Erreur lors de la validation des rôles: ${error.message}`);
      return { hasAllowedRole: false, userRoleNames: [] };
    }
  }

  /**
   * Traite le callback OAuth2 complet et retourne les données nécessaires
   * 
   * Cette méthode centralise toute la logique du callback :
   * - Échange du code contre un token
   * - Validation de l'utilisateur et de ses permissions
   * - Génération du JWT
   */
  async processOAuth2Callback(code: string): Promise<{
    success: boolean;
    jwt?: string;
    user?: DiscordUser;
    errorMessage?: string;
  }> {
    try {
      this.logger.log('Échange du code contre un token d\'accès...');
      const accessToken = await this.exchangeCodeForToken(code);
      
      this.logger.log('Récupération des informations utilisateur...');
      const user = await this.getUserInfo(accessToken);
      
      this.logger.log(`Validation de l'appartenance au serveur pour l'utilisateur ${user.id}...`);
      const { isValid, roles, guildMember } = await this.validateUserGuild(accessToken, user.id);
      
      if (!isValid) {
        this.logger.warn(`L'utilisateur ${user.id} n'est pas membre du serveur autorisé`);
        return {
          success: false,
          errorMessage: "L'utilisateur n'est pas membre du serveur autorisé"
        };
      }

      const { hasAllowedRole, userRoleNames } = await this.validateUserRoles(guildMember);
      
      if (!hasAllowedRole) {
        this.logger.warn(`L'utilisateur ${user.id} n'a pas les rôles requis : ${userRoleNames.join(', ')}`);
        return {
          success: false,
          errorMessage: "Vous n'avez pas les permissions nécessaires pour accéder à cette application."
        };
      }
      
      this.logger.log('Génération du JWT...');
      const jwt = this.generateJwtToken(user, roles);
      
      return {
        success: true,
        jwt,
        user
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du callback: ${error.message}`, error.stack);
      return {
        success: false,
        errorMessage: error.message
      };
    }
  }

  /**
   * Traite les informations utilisateur depuis un JWT existant
   * 
   * Utilisé pour récupérer les infos utilisateur quand on a déjà un JWT valide
   */
  processJwtUserInfo(jwtUser: any): {
    user: DiscordUser;
    roles: string[];
    isInAllowedGuild: boolean;
    guilds: any[];
  } {
    const user = {
      id: jwtUser.userId || jwtUser.sub,
      username: jwtUser.username,
      discriminator: '0000',
      avatar: '',
      email: undefined
    };
    
    const roles = jwtUser.roles || [];
    const isInAllowedGuild = true; // Si on a un JWT valide, c'est qu'il est membre
    const guilds = []; // Pas de liste des serveurs en mode JWT
    
    return { user, roles, isInAllowedGuild, guilds };
  }

  /**
   * Traite les informations utilisateur depuis un code OAuth2
   * 
   * Utilisé pour récupérer les infos utilisateur avec un code OAuth2
   */
  async processOAuth2UserInfo(code: string): Promise<{
    user: DiscordUser;
    roles: string[];
    isInAllowedGuild: boolean;
    guilds: any[];
    guildMember: DiscordGuildMember | null;
  }> {
    const accessToken = await this.exchangeCodeForToken(code);
    const user = await this.getUserInfo(accessToken);
    const guilds = await this.getUserGuilds(accessToken);
    
    const isInAllowedGuild = guilds.some(guild => guild.id === this.allowedGuildId);
    let guildMember: DiscordGuildMember | null = null;
    let roles: string[] = [];
    
    if (isInAllowedGuild) {
      try {
        guildMember = await this.getGuildMember(user.id, accessToken);
        roles = guildMember.roles;
      } catch (error) {
        this.logger.error(`Erreur lors de la récupération des informations du membre: ${error.message}`);
      }
    }
    
    return { user, roles, isInAllowedGuild, guilds, guildMember };
  }

  /**
   * Génère notre propre token JWT avec les infos de l'utilisateur
   * 
   * On ne garde pas le token Discord, on crée notre propre token qui contient
   * les infos essentielles : ID utilisateur, nom, rôles, etc.
   */
  generateJwtToken(user: DiscordUser, roles: string[]): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles,
      guildId: this.allowedGuildId,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Vérifie si un utilisateur a un rôle spécifique
   * 
   * Utilisé pour les vérifications de permissions dans les guards
   */
  hasRole(userRoles: string[], requiredRole: string): boolean {
    return userRoles.includes(requiredRole);
  }

  /**
   * Récupère la liste complète des rôles d'un serveur Discord
   * 
   * Utilise le token de bot pour récupérer tous les rôles du serveur.
   * Ça nous permet de faire le mapping entre les IDs de rôles et leurs noms.
   */
  async getGuildRoles(guildId: string): Promise<{ id: string, name: string }[]> {
    if (!this.botToken) {
      throw new Error('DISCORD_BOT_TOKEN n\'est pas défini dans les variables d\'environnement');
    }
    try {
      const rolesResponse = await firstValueFrom(
        this.httpService.get(`${this.discordApiUrl}/guilds/${guildId}/roles`, {
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
        }),
      );
      return rolesResponse.data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des rôles du serveur: ${error.message}`);
      throw new UnauthorizedException('Impossible de récupérer les rôles du serveur Discord');
    }
  }

  /**
   * Retourne la configuration des cookies selon l'environnement
   * 
   * Centralise la logique de configuration des cookies pour éviter la duplication
   */
  getCookieConfig(jwt: string): {
    name: string;
    value: string;
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict' | 'lax';
      path: string;
      maxAge: number;
      domain?: string;
    };
  } {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      name: 'auth_token',
      value: jwt,
      options: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, 
        domain: isProduction ? undefined : 'localhost'
      }
    };
  }

  /**
   * Retourne la configuration pour supprimer un cookie
   */
  getClearCookieConfig(): {
    name: string;
    options: {
      path: string;
      domain?: string;
    };
  } {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      name: 'auth_token',
      options: {
        path: '/',
        domain: isProduction ? undefined : 'localhost'
      }
    };
  }
} 