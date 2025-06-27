import { describe, it, expect } from 'vitest';
import { AuthValidationDto } from './auth-validation.dto';

describe('AuthValidationDto', () => {
  it('should create a valid AuthValidationDto instance', () => {
    const authValidation = new AuthValidationDto();
    authValidation.isValid = true;
    authValidation.roles = ['123456789012345678', '234567890123456789'];

    expect(authValidation).toBeInstanceOf(AuthValidationDto);
    expect(authValidation.isValid).toBe(true);
    expect(authValidation.roles).toEqual(['123456789012345678', '234567890123456789']);
  });

  it('should have correct structure', () => {
    const authValidation = new AuthValidationDto();
    
    expect(authValidation).toHaveProperty('isValid');
    expect(authValidation).toHaveProperty('roles');
  });

  it('should allow false validation', () => {
    const authValidation = new AuthValidationDto();
    authValidation.isValid = false;
    authValidation.roles = [];

    expect(authValidation.isValid).toBe(false);
    expect(authValidation.roles).toEqual([]);
  });

  it('should handle empty roles array', () => {
    const authValidation = new AuthValidationDto();
    authValidation.isValid = true;
    authValidation.roles = [];

    expect(authValidation.isValid).toBe(true);
    expect(authValidation.roles).toEqual([]);
  });
}); 