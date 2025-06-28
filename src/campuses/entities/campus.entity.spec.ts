/* 
 * Tests pour l'entité Campus
 * 
 * Ces tests vérifient que l'entité Campus est bien définie et fonctionne correctement.
 * On teste la structure de base, la création d'instances et les propriétés.
 */
import { describe, it, expect } from 'vitest';
import { Campus } from './campus.entity';

describe('Campus Entity', () => {
  /* Vérifie que la classe Campus existe bien */
  it('should be defined', () => {
    expect(Campus).toBeDefined();
  });

  /* Vérifie que Campus est bien une classe (et pas un objet ou autre) */
  it('should be a class', () => {
    expect(typeof Campus).toBe('function');
  });

  /* Vérifie que le nom de la classe est correct */
  it('should have the correct name', () => {
    expect(Campus.name).toBe('Campus');
  });

  /* Vérifie qu'on peut créer une instance de Campus */
  it('should create an instance', () => {
    const campus = new Campus();
    expect(campus).toBeInstanceOf(Campus);
  });

  /* Vérifie que les propriétés sont undefined par défaut (avant sauvegarde en DB) */
  it('should have default values', () => {
    const campus = new Campus();
    expect(campus.uuidCampus).toBeUndefined();
    expect(campus.name).toBeUndefined();
    expect(campus.uuidGuild).toBeUndefined();
    expect(campus.createdAt).toBeUndefined();
    expect(campus.updatedAt).toBeUndefined();
  });

  /* Vérifie qu'on peut assigner des valeurs aux propriétés */
  it('should accept custom values', () => {
    const campus = new Campus();
    campus.name = 'Test Campus';
    campus.uuidGuild = '123456789012345678';
    
    expect(campus.name).toBe('Test Campus');
    expect(campus.uuidGuild).toBe('123456789012345678');
  });
}); 