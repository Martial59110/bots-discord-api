import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentificationRequestsModule } from './identification-requests.module';
import { IdentificationRequestsController } from './identification-requests.controller';
import { IdentificationRequestsService } from './identification-requests.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IdentificationRequest } from './entities/identification-request.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('IdentificationRequestsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [IdentificationRequestsModule],
    })
      .overrideProvider(getRepositoryToken(IdentificationRequest))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide IdentificationRequestsController', () => {
    const controller = module.get<IdentificationRequestsController>(IdentificationRequestsController);
    expect(controller).toBeInstanceOf(IdentificationRequestsController);
  });

  it('should provide IdentificationRequestsService', () => {
    const service = module.get<IdentificationRequestsService>(IdentificationRequestsService);
    expect(service).toBeInstanceOf(IdentificationRequestsService);
  });
}); 