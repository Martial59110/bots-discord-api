import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XpTransactionsModule } from './xp-transactions.module';
import { XpTransactionsController } from './xp-transactions.controller';
import { XpTransactionsService } from './xp-transactions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { XpTransaction } from './entities/xp-transaction.entity';
import { Member } from '../members/entities/member.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('XpTransactionsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [XpTransactionsModule],
    })
      .overrideProvider(getRepositoryToken(XpTransaction))
      .useValue(mockRepository())
      .overrideProvider(getRepositoryToken(Member))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide XpTransactionsController', () => {
    const controller = module.get<XpTransactionsController>(XpTransactionsController);
    expect(controller).toBeInstanceOf(XpTransactionsController);
  });

  it('should provide XpTransactionsService', () => {
    const service = module.get<XpTransactionsService>(XpTransactionsService);
    expect(service).toBeInstanceOf(XpTransactionsService);
  });
}); 