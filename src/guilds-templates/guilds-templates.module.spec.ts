import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildsTemplatesModule } from './guilds-templates.module';
import { GuildsTemplatesController } from './guilds-templates.controller';
import { GuildsTemplatesService } from './guilds-templates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuildTemplate } from './entities/guild-template.entity';

const mockRepository = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('GuildsTemplatesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [GuildsTemplatesModule],
    })
      .overrideProvider(getRepositoryToken(GuildTemplate))
      .useValue(mockRepository())
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide GuildsTemplatesController', () => {
    const controller = module.get<GuildsTemplatesController>(GuildsTemplatesController);
    expect(controller).toBeInstanceOf(GuildsTemplatesController);
  });

  it('should provide GuildsTemplatesService', () => {
    const service = module.get<GuildsTemplatesService>(GuildsTemplatesService);
    expect(service).toBeInstanceOf(GuildsTemplatesService);
  });
}); 