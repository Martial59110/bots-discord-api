import { describe, it, expect } from 'vitest';
import { Campus } from './campus.entity';

describe('Campus Entity', () => {
  it('should be defined', () => {
    expect(Campus).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof Campus).toBe('function');
  });

  it('should have the correct name', () => {
    expect(Campus.name).toBe('Campus');
  });

  it('should create an instance', () => {
    const campus = new Campus();
    expect(campus).toBeInstanceOf(Campus);
  });

  it('should have default values', () => {
    const campus = new Campus();
    expect(campus.uuidCampus).toBeUndefined();
    expect(campus.name).toBeUndefined();
    expect(campus.uuidGuild).toBeUndefined();
    expect(campus.createdAt).toBeUndefined();
    expect(campus.updatedAt).toBeUndefined();
  });

  it('should accept custom values', () => {
    const campus = new Campus();
    campus.name = 'Test Campus';
    campus.uuidGuild = '123456789012345678';
    
    expect(campus.name).toBe('Test Campus');
    expect(campus.uuidGuild).toBe('123456789012345678');
  });
}); 