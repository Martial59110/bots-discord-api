import { describe, it, expect } from 'vitest';
import { UpdateMemberRolesDto } from './update-member-roles.dto';

describe('UpdateMemberRolesDto', () => {
  it('should be defined', () => {
    expect(UpdateMemberRolesDto).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof UpdateMemberRolesDto).toBe('function');
  });

  it('should have the correct name', () => {
    expect(UpdateMemberRolesDto.name).toBe('UpdateMemberRolesDto');
  });

  it('should create an instance', () => {
    const dto = new UpdateMemberRolesDto();
    expect(dto).toBeInstanceOf(UpdateMemberRolesDto);
  });

  it('should accept valid data', () => {
    const dto = new UpdateMemberRolesDto();
    dto.roleIds = ['123456789', '987654321'];
    
    expect(dto.roleIds).toEqual(['123456789', '987654321']);
  });

  it('should have correct property types', () => {
    const dto = new UpdateMemberRolesDto();
    dto.roleIds = ['123456789', '987654321'];
    
    expect(Array.isArray(dto.roleIds)).toBe(true);
    dto.roleIds.forEach(roleId => {
      expect(typeof roleId).toBe('string');
    });
  });
}); 