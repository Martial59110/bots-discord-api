import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourcesModule } from './resources.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { Member } from '../members/entities/member.entity';
import { Comment } from '../comments/entities/comment.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('ResourcesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ResourcesModule],
    })
      .overrideProvider(getRepositoryToken(Resource))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Member))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Comment))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide ResourcesController', () => {
    const controller = module.get<ResourcesController>(ResourcesController);
    expect(controller).toBeInstanceOf(ResourcesController);
  });

  it('should provide ResourcesService', () => {
    const service = module.get<ResourcesService>(ResourcesService);
    expect(service).toBeInstanceOf(ResourcesService);
  });
}); 