import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto';
import { ReportCategory, ReportType } from '../entities/report.entity';
import { describe, it, expect } from 'vitest';

describe('CreateReportDto', () => {
  it('should validate a correct DTO', async () => {
    const dto = new CreateReportDto();
    dto.type = ReportType.RESOURCE;
    dto.category = ReportCategory.SPAM;
    dto.reason = 'Test reason';
    dto.uuidReporter = '123e4567-e89b-12d3-a456-426614174000';
    dto.uuidResource = '123e4567-e89b-12d3-a456-426614174001';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('category validation', () => {
    it('should reject invalid category', async () => {
      const dto = new CreateReportDto();
      dto.type = ReportType.RESOURCE;
      dto.category = 'invalid' as ReportCategory;
      dto.reason = 'Test reason';
      dto.uuidReporter = '123e4567-e89b-12d3-a456-426614174000';
      dto.uuidResource = '123e4567-e89b-12d3-a456-426614174001';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should reject missing category', async () => {
      const dto = new CreateReportDto();
      dto.type = ReportType.RESOURCE;
      dto.reason = 'Test reason';
      dto.uuidReporter = '123e4567-e89b-12d3-a456-426614174000';
      dto.uuidResource = '123e4567-e89b-12d3-a456-426614174001';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('reason validation', () => {
    it('should reject empty reason', async () => {
      const dto = new CreateReportDto();
      dto.type = ReportType.RESOURCE;
      dto.category = ReportCategory.SPAM;
      dto.reason = '';
      dto.uuidReporter = '123e4567-e89b-12d3-a456-426614174000';
      dto.uuidResource = '123e4567-e89b-12d3-a456-426614174001';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject reason > 50 chars', async () => {
      const dto = new CreateReportDto();
      dto.type = ReportType.RESOURCE;
      dto.category = ReportCategory.SPAM;
      dto.reason = 'a'.repeat(51);
      dto.uuidReporter = '123e4567-e89b-12d3-a456-426614174000';
      dto.uuidResource = '123e4567-e89b-12d3-a456-426614174001';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('type validation', () => {
    it('should reject missing type', async () => {
      const dto = new CreateReportDto();
      dto.category = ReportCategory.SPAM;
      dto.reason = 'Test reason';
      dto.uuidReporter = '123e4567-e89b-12d3-a456-426614174000';
      dto.uuidResource = '123e4567-e89b-12d3-a456-426614174001';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });
}); 