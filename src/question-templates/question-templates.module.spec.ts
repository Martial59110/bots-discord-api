import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionTemplatesModule } from './question-templates.module';
import { QuestionTemplatesController } from './question-templates.controller';
import { QuestionTemplatesService } from './question-templates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PollTemplate } from '../poll-templates/entities/poll-template.entity';
import { QuestionTemplate } from './entities/question-template.entity';
import { AnswerTemplate } from '../answer-templates/entities/answer-template.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('QuestionTemplatesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [QuestionTemplatesModule],
    })
      .overrideProvider(getRepositoryToken(PollTemplate))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(QuestionTemplate))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(AnswerTemplate))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide QuestionTemplatesController', () => {
    const controller = module.get<QuestionTemplatesController>(QuestionTemplatesController);
    expect(controller).toBeInstanceOf(QuestionTemplatesController);
  });

  it('should provide QuestionTemplatesService', () => {
    const service = module.get<QuestionTemplatesService>(QuestionTemplatesService);
    expect(service).toBeInstanceOf(QuestionTemplatesService);
  });
}); 