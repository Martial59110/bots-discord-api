import { describe, it, expect } from 'vitest';
import { Formation } from './formation.entity';

describe('Formation Entity', () => {
  it('should be defined', () => {
    expect(Formation).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof Formation).toBe('function');
  });

  it('should have the correct name', () => {
    expect(Formation.name).toBe('Formation');
  });

  it('should create an instance', () => {
    const formation = new Formation();
    expect(formation).toBeInstanceOf(Formation);
  });

  it('should have default values', () => {
    const formation = new Formation();
    expect(formation.uuidFormation).toBeUndefined();
    expect(formation.name).toBeUndefined();
    expect(formation.uuidGuild).toBeUndefined();
    expect(formation.uuidRole).toBeUndefined();
    expect(formation.createdAt).toBeUndefined();
    expect(formation.updatedAt).toBeUndefined();
  });

  it('should accept custom values', () => {
    const formation = new Formation();
    formation.name = 'Test Formation';
    formation.uuidGuild = '123456789012345678';
    formation.uuidRole = '987654321098765432';
    
    expect(formation.name).toBe('Test Formation');
    expect(formation.uuidGuild).toBe('123456789012345678');
    expect(formation.uuidRole).toBe('987654321098765432');
  });
}); 