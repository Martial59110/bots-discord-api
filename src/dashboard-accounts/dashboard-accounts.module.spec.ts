import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardAccountModule } from './dashboard-accounts.module';
import { DashboardAccountController } from './dashboard-accounts.controller';
import { DashboardAccountService } from './dashboard-accounts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardAccount } from './entities/dashboard-account.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('DashboardAccountModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DashboardAccountModule],
    })
      .overrideProvider(getRepositoryToken(DashboardAccount))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide DashboardAccountController', () => {
    const controller = module.get<DashboardAccountController>(DashboardAccountController);
    expect(controller).toBeInstanceOf(DashboardAccountController);
  });

  it('should provide DashboardAccountService', () => {
    const service = module.get<DashboardAccountService>(DashboardAccountService);
    expect(service).toBeInstanceOf(DashboardAccountService);
  });
}); 