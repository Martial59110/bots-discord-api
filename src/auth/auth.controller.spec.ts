import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { DiscordUser } from './interfaces/discord-user.interface';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let configService: ConfigService;

  const mockAuthService = {
    exchangeCodeForToken: vi.fn(),
    getUserInfo: vi.fn(),
    validateUserGuild: vi.fn(),
    generateJwtToken: vi.fn(),
    getGuildRoles: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key) => {
      const config = {
        'DISCORD_CLIENT_ID': 'client_id',
        'DISCORD_REDIRECT_URI': 'http://localhost:3000/auth/callback',
        'FRONTEND_URL': 'http://localhost:4200',
        'ALLOWED_GUILD_ID': 'guild_id',
      };
      return config[key];
    }),
  };

  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    send: vi.fn(),
    cookie: vi.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
    
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should redirect to Discord authorization URL', () => {
      const clientId = 'client_id';
      const redirectUri = encodeURIComponent('http://localhost:3000/auth/callback');
      const scope = encodeURIComponent('identify email guilds guilds.members.read');
      const expectedUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

      controller.login(mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(302);
      expect(mockResponse.header).toHaveBeenCalledWith('Location', expectedUrl);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe('callback', () => {
    it('should process callback successfully and redirect with success', async () => {
      const code = 'auth_code';
      const accessToken = 'access_token';
      const user: DiscordUser = {
        id: 'user_id',
        username: 'test_user',
        discriminator: '1234',
        avatar: 'avatar_hash',
      };
      const validationResult = { 
        isValid: true, 
        roles: ['role_1', 'role_2'],
        guildMember: {
          nick: 'nickname',
          roles: ['role_1', 'role_2'],
          user: {
            id: 'user_id',
            username: 'test_user',
            discriminator: '1234',
            avatar: 'avatar_hash',
          },
        }
      };
      const jwt = 'jwt_token';
      const guildRoles = [
        { id: 'role_1', name: 'Administrateur' },
        { id: 'role_2', name: 'Chargé de projet' }
      ];

      mockAuthService.exchangeCodeForToken.mockResolvedValue(accessToken);
      mockAuthService.getUserInfo.mockResolvedValue(user);
      mockAuthService.validateUserGuild.mockResolvedValue(validationResult);
      mockAuthService.generateJwtToken.mockReturnValue(jwt);
      mockAuthService.getGuildRoles.mockResolvedValue(guildRoles);

      await controller.callback(code, mockResponse as any);

      expect(mockAuthService.exchangeCodeForToken).toHaveBeenCalledWith(code);
      expect(mockAuthService.getUserInfo).toHaveBeenCalledWith(accessToken);
      expect(mockAuthService.validateUserGuild).toHaveBeenCalledWith(accessToken, user.id);
      expect(mockAuthService.getGuildRoles).toHaveBeenCalledWith('guild_id');
      expect(mockAuthService.generateJwtToken).toHaveBeenCalledWith(user, validationResult.roles);
      expect(mockResponse.cookie).toHaveBeenCalledWith('auth_token', jwt, expect.any(Object));
      expect(mockResponse.status).toHaveBeenCalledWith(302);
      expect(mockResponse.header).toHaveBeenCalledWith('Location', 'http://localhost:4200/auth-callback-page?success=true');
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when code is not provided', async () => {
      const code = '' as any;

      await expect(controller.callback(code, mockResponse as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should redirect to error page when user is not in allowed guild', async () => {
      const code = 'auth_code';
      const accessToken = 'access_token';
      const user: DiscordUser = {
        id: 'user_id',
        username: 'test_user',
        discriminator: '1234',
        avatar: 'avatar_hash',
      };
      const validationResult = { 
        isValid: false, 
        roles: [],
        guildMember: null
      };

      mockAuthService.exchangeCodeForToken.mockResolvedValue(accessToken);
      mockAuthService.getUserInfo.mockResolvedValue(user);
      mockAuthService.validateUserGuild.mockResolvedValue(validationResult);

      await controller.callback(code, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(302);
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Location', 
        `http://localhost:4200/auth-callback-page?message=${encodeURIComponent("L'utilisateur n'est pas membre du serveur autorisé")}`
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should redirect to error page when an error occurs', async () => {
      const code = 'auth_code';
      const error = new Error('Test error');

      mockAuthService.exchangeCodeForToken.mockRejectedValue(error);

      await controller.callback(code, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(302);
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Location',
        `http://localhost:4200/auth-callback-page?message=${encodeURIComponent('Test error')}`
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });
}); 