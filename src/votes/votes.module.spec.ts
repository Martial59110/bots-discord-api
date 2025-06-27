import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VotesModule } from './votes.module';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Vote } from './entities/vote.entity';
import { Member } from '../members/entities/member.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Comment } from '../comments/entities/comment.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('VotesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [VotesModule],
    })
      .overrideProvider(getRepositoryToken(Vote))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Member))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Resource))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Comment))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide VotesController', () => {
    const controller = module.get<VotesController>(VotesController);
    expect(controller).toBeInstanceOf(VotesController);
  });

  it('should provide VotesService', () => {
    const service = module.get<VotesService>(VotesService);
    expect(service).toBeInstanceOf(VotesService);
  });
}); 