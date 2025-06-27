import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnswerTemplatesModule } from './answer-templates.module';
import { AnswerTemplatesController } from './answer-templates.controller';
import { AnswerTemplatesService } from './answer-templates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnswerTemplate } from './entities/answer-template.entity';
import { QuestionTemplate } from '../question-templates/entities/question-template.entity';
import { PollTemplate } from '../poll-templates/entities/poll-template.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('AnswerTemplatesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AnswerTemplatesModule],
    })
      .overrideProvider(getRepositoryToken(AnswerTemplate))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(QuestionTemplate))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(PollTemplate))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide AnswerTemplatesController', () => {
    const controller = module.get<AnswerTemplatesController>(AnswerTemplatesController);
    expect(controller).toBeInstanceOf(AnswerTemplatesController);
  });

  it('should provide AnswerTemplatesService', () => {
    const service = module.get<AnswerTemplatesService>(AnswerTemplatesService);
    expect(service).toBeInstanceOf(AnswerTemplatesService);
  });
}); 