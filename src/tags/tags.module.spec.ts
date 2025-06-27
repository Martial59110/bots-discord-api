import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagsModule } from './tags.module';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('TagsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TagsModule],
    })
      .overrideProvider(getRepositoryToken(Tag))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide TagsController', () => {
    const controller = module.get<TagsController>(TagsController);
    expect(controller).toBeInstanceOf(TagsController);
  });

  it('should provide TagsService', () => {
    const service = module.get<TagsService>(TagsService);
    expect(service).toBeInstanceOf(TagsService);
  });
}); 