import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnswersModule } from './answers.module';
import { AnswersController } from './answers.controller';
import { AnswersService } from './answers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Answer } from './entities/answer.entity';
import { Question } from '../questions/entities/question.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('AnswersModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AnswersModule],
    })
      .overrideProvider(getRepositoryToken(Answer))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Question))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide AnswersController', () => {
    const controller = module.get<AnswersController>(AnswersController);
    expect(controller).toBeInstanceOf(AnswersController);
  });

  it('should provide AnswersService', () => {
    const service = module.get<AnswersService>(AnswersService);
    expect(service).toBeInstanceOf(AnswersService);
  });
}); 