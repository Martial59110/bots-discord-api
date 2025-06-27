import { describe, it, expect } from 'vitest';
import { Category } from './category.entity';

describe('Category Entity', () => {
  it('should be defined', () => {
    expect(Category).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof Category).toBe('function');
  });

  it('should have the correct name', () => {
    expect(Category.name).toBe('Category');
  });

  it('should create an instance', () => {
    const category = new Category();
    expect(category).toBeInstanceOf(Category);
  });

  it('should have default values', () => {
    const category = new Category();
    expect(category.uuid).toBeUndefined();
    expect(category.name).toBeUndefined();
    expect(category.position).toBeUndefined();
    expect(category.uuidGuild).toBeUndefined();
    expect(category.createdAt).toBeUndefined();
    expect(category.updatedAt).toBeUndefined();
  });

  it('should accept custom values', () => {
    const category = new Category();
    category.name = 'Test Category';
    category.position = 1;
    category.uuidGuild = '123456789012345678';
    
    expect(category.name).toBe('Test Category');
    expect(category.position).toBe(1);
    expect(category.uuidGuild).toBe('123456789012345678');
  });
}); 