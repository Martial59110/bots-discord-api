import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let authService: AuthService;

  const mockAuthService = {
    getGuildRoles: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', async () => {
      // Arrange
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: {
              roles: ['user'],
            },
          }),
        }),
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has required role', async () => {
      // Arrange
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: {
              roles: ['1376545234560749650'],
              guildId: '1376536408583311360',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      mockAuthService.getGuildRoles.mockResolvedValue([
        { id: '1376545234560749650', name: 'Administrateur' }
      ]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockAuthService.getGuildRoles).toHaveBeenCalledWith('1376536408583311360');
    });

    it('should return false when user does not have required role', async () => {
      // Arrange
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: {
              roles: ['1376545234560749650'],
              guildId: '1376536408583311360',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      mockAuthService.getGuildRoles.mockResolvedValue([
        { id: '1376545234560749650', name: 'Membre' }
      ]);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user has no roles', async () => {
      // Arrange
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: {
              roles: [],
              guildId: '1376536408583311360',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when getGuildRoles throws an error', async () => {
      // Arrange
      const context = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: {
              roles: ['1376545234560749650'],
              guildId: '1376536408583311360',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      mockAuthService.getGuildRoles.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });
  });
}); 