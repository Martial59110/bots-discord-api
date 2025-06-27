import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentsModule } from './comments.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('CommentsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CommentsModule],
    })
      .overrideProvider(getRepositoryToken(Comment))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide CommentsController', () => {
    const controller = module.get<CommentsController>(CommentsController);
    expect(controller).toBeInstanceOf(CommentsController);
  });

  it('should provide CommentsService', () => {
    const service = module.get<CommentsService>(CommentsService);
    expect(service).toBeInstanceOf(CommentsService);
  });
}); 