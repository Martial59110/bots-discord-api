import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsModule } from './reports.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { Member } from '../members/entities/member.entity';
import { Resource } from '../resources/entities/resource.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('ReportsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ReportsModule],
    })
      .overrideProvider(getRepositoryToken(Report))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Member))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Resource))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide ReportsController', () => {
    const controller = module.get<ReportsController>(ReportsController);
    expect(controller).toBeInstanceOf(ReportsController);
  });

  it('should provide ReportsService', () => {
    const service = module.get<ReportsService>(ReportsService);
    expect(service).toBeInstanceOf(ReportsService);
  });
}); 