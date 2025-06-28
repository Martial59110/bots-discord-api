import { describe, it, expect } from 'vitest';

describe('DiscordUser Interface', () => {
  it('should be defined', () => {
    
    const mockDiscordUser = {
      id: '123456789',
      username: 'testuser',
      discriminator: '1234',
      avatar: 'avatar.png',
      email: 'test@example.com',
    };

    expect(mockDiscordUser).toBeDefined();
    expect(mockDiscordUser.id).toBe('123456789');
    expect(mockDiscordUser.username).toBe('testuser');
    expect(mockDiscordUser.discriminator).toBe('1234');
    expect(mockDiscordUser.avatar).toBe('avatar.png');
    expect(mockDiscordUser.email).toBe('test@example.com');
  });

  it('should have correct property types', () => {
    const mockDiscordUser = {
      id: '123456789',
      username: 'testuser',
      discriminator: '1234',
      avatar: 'avatar.png',
      email: 'test@example.com',
    };

    expect(typeof mockDiscordUser.id).toBe('string');
    expect(typeof mockDiscordUser.username).toBe('string');
    expect(typeof mockDiscordUser.discriminator).toBe('string');
    expect(typeof mockDiscordUser.avatar).toBe('string');
    expect(typeof mockDiscordUser.email).toBe('string');
  });
}); 