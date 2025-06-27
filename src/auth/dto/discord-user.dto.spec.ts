import { describe, it, expect } from 'vitest';
import { DiscordUserDto, DiscordGuildDto, DiscordGuildMemberDto } from './discord-user.dto';

describe('DiscordUserDto', () => {
  it('should create a valid DiscordUserDto instance', () => {
    const discordUser = new DiscordUserDto();
    discordUser.id = '123456789012345678';
    discordUser.username = 'discord_user';
    discordUser.discriminator = '1234';
    discordUser.avatar = 'a1b2c3d4e5f6g7h8i9j0';
    discordUser.email = 'user@example.com';
    discordUser.verified = true;

    expect(discordUser).toBeInstanceOf(DiscordUserDto);
    expect(discordUser.id).toBe('123456789012345678');
    expect(discordUser.username).toBe('discord_user');
    expect(discordUser.discriminator).toBe('1234');
    expect(discordUser.avatar).toBe('a1b2c3d4e5f6g7h8i9j0');
    expect(discordUser.email).toBe('user@example.com');
    expect(discordUser.verified).toBe(true);
  });

  it('should have correct structure', () => {
    const discordUser = new DiscordUserDto();
    
    expect(discordUser).toHaveProperty('id');
    expect(discordUser).toHaveProperty('username');
    expect(discordUser).toHaveProperty('discriminator');
    expect(discordUser).toHaveProperty('avatar');
    expect(discordUser).toHaveProperty('email');
    expect(discordUser).toHaveProperty('verified');
  });

  it('should allow optional properties to be undefined', () => {
    const discordUser = new DiscordUserDto();
    discordUser.id = '123456789012345678';
    discordUser.username = 'discord_user';
    discordUser.discriminator = '1234';
    discordUser.avatar = 'a1b2c3d4e5f6g7h8i9j0';

    expect(discordUser.email).toBeUndefined();
    expect(discordUser.verified).toBeUndefined();
  });
});

describe('DiscordGuildDto', () => {
  it('should create a valid DiscordGuildDto instance', () => {
    const discordGuild = new DiscordGuildDto();
    discordGuild.id = '123456789012345678';
    discordGuild.name = 'Serveur Discord';
    discordGuild.icon = 'a1b2c3d4e5f6g7h8i9j0';
    discordGuild.owner = false;
    discordGuild.permissions = 104324161;
    discordGuild.features = ['WELCOME_SCREEN', 'COMMUNITY'];

    expect(discordGuild).toBeInstanceOf(DiscordGuildDto);
    expect(discordGuild.id).toBe('123456789012345678');
    expect(discordGuild.name).toBe('Serveur Discord');
    expect(discordGuild.icon).toBe('a1b2c3d4e5f6g7h8i9j0');
    expect(discordGuild.owner).toBe(false);
    expect(discordGuild.permissions).toBe(104324161);
    expect(discordGuild.features).toEqual(['WELCOME_SCREEN', 'COMMUNITY']);
  });

  it('should have correct structure', () => {
    const discordGuild = new DiscordGuildDto();
    
    expect(discordGuild).toHaveProperty('id');
    expect(discordGuild).toHaveProperty('name');
    expect(discordGuild).toHaveProperty('icon');
    expect(discordGuild).toHaveProperty('owner');
    expect(discordGuild).toHaveProperty('permissions');
    expect(discordGuild).toHaveProperty('features');
  });
});

describe('DiscordGuildMemberDto', () => {
  it('should create a valid DiscordGuildMemberDto instance', () => {
    const user = new DiscordUserDto();
    user.id = '123456789012345678';
    user.username = 'discord_user';
    user.discriminator = '1234';
    user.avatar = 'a1b2c3d4e5f6g7h8i9j0';

    const discordGuildMember = new DiscordGuildMemberDto();
    discordGuildMember.user = user;
    discordGuildMember.nick = 'Surnom';
    discordGuildMember.roles = ['123456789012345678', '234567890123456789'];

    expect(discordGuildMember).toBeInstanceOf(DiscordGuildMemberDto);
    expect(discordGuildMember.user).toBeInstanceOf(DiscordUserDto);
    expect(discordGuildMember.user.id).toBe('123456789012345678');
    expect(discordGuildMember.nick).toBe('Surnom');
    expect(discordGuildMember.roles).toEqual(['123456789012345678', '234567890123456789']);
  });

  it('should allow null nick', () => {
    const user = new DiscordUserDto();
    user.id = '123456789012345678';
    user.username = 'discord_user';
    user.discriminator = '1234';
    user.avatar = 'a1b2c3d4e5f6g7h8i9j0';

    const discordGuildMember = new DiscordGuildMemberDto();
    discordGuildMember.user = user;
    discordGuildMember.nick = null;
    discordGuildMember.roles = ['123456789012345678'];

    expect(discordGuildMember.nick).toBeNull();
  });

  it('should have correct structure', () => {
    const discordGuildMember = new DiscordGuildMemberDto();
    
    expect(discordGuildMember).toHaveProperty('user');
    expect(discordGuildMember).toHaveProperty('nick');
    expect(discordGuildMember).toHaveProperty('roles');
  });
}); 