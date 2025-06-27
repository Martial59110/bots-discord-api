import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembersInformationsModule } from './members-informations.module';
import { MembersInformationsController } from './members-informations.controller';
import { MembersInformationsService } from './members-informations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberInformation } from './entities/member-information.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('MembersInformationsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MembersInformationsModule],
    })
      .overrideProvider(getRepositoryToken(MemberInformation))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide MembersInformationsController', () => {
    const controller = module.get<MembersInformationsController>(MembersInformationsController);
    expect(controller).toBeInstanceOf(MembersInformationsController);
  });

  it('should provide MembersInformationsService', () => {
    const service = module.get<MembersInformationsService>(MembersInformationsService);
    expect(service).toBeInstanceOf(MembersInformationsService);
  });
}); 