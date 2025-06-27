import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollsModule } from './polls.module';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Poll } from './entities/poll.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../answers/entities/answer.entity';
import { Member } from '../members/entities/member.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('PollsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PollsModule],
    })
      .overrideProvider(getRepositoryToken(Poll))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Question))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Answer))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Member))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide PollsController', () => {
    const controller = module.get<PollsController>(PollsController);
    expect(controller).toBeInstanceOf(PollsController);
  });

  it('should provide PollsService', () => {
    const service = module.get<PollsService>(PollsService);
    expect(service).toBeInstanceOf(PollsService);
  });
}); 