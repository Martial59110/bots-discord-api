import { describe, it, expect } from 'vitest';
import { JwtPayloadDto } from './jwt-payload.dto';

describe('JwtPayloadDto', () => {
  it('should create a valid JwtPayloadDto instance', () => {
    const jwtPayload = new JwtPayloadDto();
    jwtPayload.sub = '123456789012345678';
    jwtPayload.username = 'discord_user';
    jwtPayload.roles = ['member', 'moderator'];
    jwtPayload.guildId = '123456789012345678';

    expect(jwtPayload).toBeInstanceOf(JwtPayloadDto);
    expect(jwtPayload.sub).toBe('123456789012345678');
    expect(jwtPayload.username).toBe('discord_user');
    expect(jwtPayload.roles).toEqual(['member', 'moderator']);
    expect(jwtPayload.guildId).toBe('123456789012345678');
  });

  it('should have correct structure', () => {
    const jwtPayload = new JwtPayloadDto();
    
    expect(jwtPayload).toHaveProperty('sub');
    expect(jwtPayload).toHaveProperty('username');
    expect(jwtPayload).toHaveProperty('roles');
    expect(jwtPayload).toHaveProperty('guildId');
  });

  it('should allow empty roles array', () => {
    const jwtPayload = new JwtPayloadDto();
    jwtPayload.sub = '123456789012345678';
    jwtPayload.username = 'discord_user';
    jwtPayload.roles = [];
    jwtPayload.guildId = '123456789012345678';

    expect(jwtPayload.roles).toEqual([]);
  });

  it('should handle single role', () => {
    const jwtPayload = new JwtPayloadDto();
    jwtPayload.sub = '123456789012345678';
    jwtPayload.username = 'discord_user';
    jwtPayload.roles = ['member'];
    jwtPayload.guildId = '123456789012345678';

    expect(jwtPayload.roles).toEqual(['member']);
  });
}); 