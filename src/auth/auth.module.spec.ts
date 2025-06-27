import { Test } from '@nestjs/testing';
import { describe, it, expect } from 'vitest';
import { AuthModule } from './auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should provide AuthController', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeInstanceOf(AuthController);
  });

  it('should provide AuthService', async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    const service = module.get<AuthService>(AuthService);
    expect(service).toBeInstanceOf(AuthService);
  });
}); 