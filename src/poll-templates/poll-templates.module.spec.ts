import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollTemplatesModule } from './poll-templates.module';
import { PollTemplatesController } from './poll-templates.controller';
import { PollTemplatesService } from './poll-templates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PollTemplate } from './entities/poll-template.entity';
import { QuestionTemplate } from '../question-templates/entities/question-template.entity';
import { AnswerTemplate } from '../answer-templates/entities/answer-template.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('PollTemplatesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PollTemplatesModule],
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

  it('should provide PollTemplatesController', () => {
    const controller = module.get<PollTemplatesController>(PollTemplatesController);
    expect(controller).toBeInstanceOf(PollTemplatesController);
  });

  it('should provide PollTemplatesService', () => {
    const service = module.get<PollTemplatesService>(PollTemplatesService);
    expect(service).toBeInstanceOf(PollTemplatesService);
  });
}); 