import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionsModule } from './questions.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Answer } from '../answers/entities/answer.entity';
import { Question } from './entities/question.entity';
import { Poll } from '../polls/entities/poll.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('QuestionsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [QuestionsModule],
    })
      .overrideProvider(getRepositoryToken(Answer))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Question))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Poll))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide QuestionsController', () => {
    const controller = module.get<QuestionsController>(QuestionsController);
    expect(controller).toBeInstanceOf(QuestionsController);
  });

  it('should provide QuestionsService', () => {
    const service = module.get<QuestionsService>(QuestionsService);
    expect(service).toBeInstanceOf(QuestionsService);
  });
}); 