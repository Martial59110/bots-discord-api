import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeratorActionsModule } from './moderator-actions.module';
import { ModeratorActionsController } from './moderator-actions.controller';
import { ModeratorActionsService } from './moderator-actions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModeratorAction } from './entities/moderator-action.entity';
import { Report } from '../reports/entities/report.entity';
import { Member } from '../members/entities/member.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('ModeratorActionsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ModeratorActionsModule],
    })
      .overrideProvider(getRepositoryToken(ModeratorAction))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Report))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Member))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide ModeratorActionsController', () => {
    const controller = module.get<ModeratorActionsController>(ModeratorActionsController);
    expect(controller).toBeInstanceOf(ModeratorActionsController);
  });

  it('should provide ModeratorActionsService', () => {
    const service = module.get<ModeratorActionsService>(ModeratorActionsService);
    expect(service).toBeInstanceOf(ModeratorActionsService);
  });
}); 