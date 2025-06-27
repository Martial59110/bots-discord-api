import { describe, it, expect } from 'vitest';
import { AuthResponseDto } from './auth-response.dto';

describe('AuthResponseDto', () => {
  it('should create a valid AuthResponseDto instance', () => {
    const authResponse = new AuthResponseDto();
    authResponse.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    authResponse.user = {
      id: '123456789012345678',
      username: 'discord_user',
      roles: ['member', 'moderator']
    };
    authResponse.message = 'Authentification réussie';

    expect(authResponse).toBeInstanceOf(AuthResponseDto);
    expect(authResponse.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    expect(authResponse.user.id).toBe('123456789012345678');
    expect(authResponse.user.username).toBe('discord_user');
    expect(authResponse.user.roles).toEqual(['member', 'moderator']);
    expect(authResponse.message).toBe('Authentification réussie');
  });

  it('should have correct structure', () => {
    const authResponse = new AuthResponseDto();
    authResponse.user = {
      id: '',
      username: '',
      roles: []
    };
    
    expect(authResponse).toHaveProperty('token');
    expect(authResponse).toHaveProperty('user');
    expect(authResponse).toHaveProperty('message');
    expect(authResponse.user).toHaveProperty('id');
    expect(authResponse.user).toHaveProperty('username');
    expect(authResponse.user).toHaveProperty('roles');
  });

  it('should allow empty values', () => {
    const authResponse = new AuthResponseDto();
    authResponse.token = '';
    authResponse.user = {
      id: '',
      username: '',
      roles: []
    };
    authResponse.message = '';

    expect(authResponse.token).toBe('');
    expect(authResponse.user.id).toBe('');
    expect(authResponse.user.username).toBe('');
    expect(authResponse.user.roles).toEqual([]);
    expect(authResponse.message).toBe('');
  });
}); 