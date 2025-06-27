import { describe, it, expect } from 'vitest';
import { UpdateModeratorActionDto } from './update-moderator-action.dto';

describe('UpdateModeratorActionDto', () => {
  it('should be defined', () => {
    expect(UpdateModeratorActionDto).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof UpdateModeratorActionDto).toBe('function');
  });

  it('should have the correct name', () => {
    expect(UpdateModeratorActionDto.name).toBe('UpdateModeratorActionDto');
  });

  it('should create an instance', () => {
    const dto = new UpdateModeratorActionDto();
    expect(dto).toBeInstanceOf(UpdateModeratorActionDto);
  });

  it('should accept valid data', () => {
    const dto = new UpdateModeratorActionDto();
    dto.action = 'warn';
    dto.reason = 'Test reason';
    dto.memberId = '123456789';
    
    expect(dto.action).toBe('warn');
    expect(dto.reason).toBe('Test reason');
    expect(dto.memberId).toBe('123456789');
  });

  it('should have correct property types', () => {
    const dto = new UpdateModeratorActionDto();
    dto.action = 'warn';
    dto.reason = 'Test reason';
    dto.memberId = '123456789';
    
    expect(typeof dto.action).toBe('string');
    expect(typeof dto.reason).toBe('string');
    expect(typeof dto.memberId).toBe('string');
  });
}); 