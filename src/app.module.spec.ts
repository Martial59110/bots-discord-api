import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppModule } from './app.module';

// Mock de PinoLogger
const mockPinoLogger = {
  setContext: vi.fn(),
  info: vi.fn(),
};

vi.mock('nestjs-pino', () => ({
  LoggerModule: {
    forRoot: vi.fn(() => ({})),
  },
  PinoLogger: vi.fn(() => mockPinoLogger),
}));

describe('AppModule', () => {
  let appModule: AppModule;

  beforeEach(() => {
    // Reset des mocks
    vi.clearAllMocks();
    // Créer une nouvelle instance du module
    appModule = new AppModule(mockPinoLogger as any);
  });

  it('should be defined', () => {
    expect(AppModule).toBeDefined();
  });

  it('should be a class', () => {
    expect(typeof AppModule).toBe('function');
  });

  it('should have the correct name', () => {
    expect(AppModule.name).toBe('AppModule');
  });

  it('should create an instance', () => {
    expect(appModule).toBeInstanceOf(AppModule);
  });

  it('should initialize logger context in constructor', () => {
    expect(mockPinoLogger.setContext).toHaveBeenCalledWith('AppModule');
  });

  it('should have onModuleInit method', () => {
    expect(typeof appModule.onModuleInit).toBe('function');
  });

  it('should log application start on module init', () => {
    appModule.onModuleInit();
    expect(mockPinoLogger.info).toHaveBeenCalledWith('Application started 🚀');
  });

  it('should implement OnModuleInit interface', () => {
    expect('onModuleInit' in appModule).toBe(true);
  });
}); 