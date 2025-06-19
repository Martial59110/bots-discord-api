import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto';
import { ReportCategory } from '../entities/report.entity';
import { describe, it, expect } from 'vitest';

describe('CreateReportDto', () => {
  it('should validate a correct DTO', async () => {
    const dto = new CreateReportDto();
    dto.reason = 'Test reason';
    dto.reportedUserId = '123456789';
    dto.reporterUserId = '987654321';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('category validation', () => {
    it('should reject invalid category', async () => {
      const dto = new CreateReportDto();
      dto.category = 'invalid' as ReportCategory;
      dto.reason = 'Test reason';
      dto.status = 'pending';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should reject missing category', async () => {
      const dto = new CreateReportDto();
      dto.reason = 'Test reason';
      dto.status = 'pending';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('reason validation', () => {
    it('should reject empty reason', async () => {
      const dto = new CreateReportDto();
      dto.reason = '';
      dto.reportedUserId = '123456789';
      dto.reporterUserId = '987654321';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject reason > 50 chars', async () => {
      const dto = new CreateReportDto();
      dto.reason = 'a'.repeat(51);
      dto.reportedUserId = '123456789';
      dto.reporterUserId = '987654321';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('status validation', () => {
    it('should reject empty status', async () => {
      const dto = new CreateReportDto();
      dto.category = ReportCategory.SPAM;
      dto.reason = 'Test reason';
      dto.status = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject missing status', async () => {
      const dto = new CreateReportDto();
      dto.category = ReportCategory.SPAM;
      dto.reason = 'Test reason';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });
}); 