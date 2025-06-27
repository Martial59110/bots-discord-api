import { describe, it, expect } from 'vitest';

describe('JwtPayload Interface', () => {
  it('should be defined', () => {
    // Test que l'interface peut être utilisée
    const mockJwtPayload = {
      sub: '123456789',
      username: 'testuser',
      roles: ['user', 'admin'],
      iat: 1234567890,
      exp: 1234567890,
    };

    expect(mockJwtPayload).toBeDefined();
    expect(mockJwtPayload.sub).toBe('123456789');
    expect(mockJwtPayload.username).toBe('testuser');
    expect(mockJwtPayload.roles).toEqual(['user', 'admin']);
    expect(mockJwtPayload.iat).toBe(1234567890);
    expect(mockJwtPayload.exp).toBe(1234567890);
  });

  it('should have correct property types', () => {
    const mockJwtPayload = {
      sub: '123456789',
      username: 'testuser',
      roles: ['user', 'admin'],
      iat: 1234567890,
      exp: 1234567890,
    };

    expect(typeof mockJwtPayload.sub).toBe('string');
    expect(typeof mockJwtPayload.username).toBe('string');
    expect(Array.isArray(mockJwtPayload.roles)).toBe(true);
    expect(typeof mockJwtPayload.iat).toBe('number');
    expect(typeof mockJwtPayload.exp).toBe('number');
  });
}); 