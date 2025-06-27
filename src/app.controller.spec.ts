import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { FastifyReply } from 'fastify';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs module avec vitest
vi.mock('fs');
const mockFs = fs as unknown as Record<string, any>;

describe('AppController', () => {
  let controller: AppController;
  let mockReply: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
    
    // Mock FastifyReply
    mockReply = {
      type: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };

    // Mock Logger
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('serveAuthTestPage', () => {
    it('should serve auth-test.html when file exists', () => {
      // Arrange
      const fileContent = '<html><body>Test</body></html>';
      const filePath = join(__dirname, '..', 'public', 'auth-test.html');
      
      mockFs.existsSync = vi.fn((path: string) => path === filePath);
      mockFs.readFileSync = vi.fn(() => fileContent);

      // Act
      controller.serveAuthTestPage(mockReply);

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockReply.type).toHaveBeenCalledWith('text/html');
      expect(mockReply.send).toHaveBeenCalledWith(fileContent);
    });

    it('should return 404 when file does not exist', () => {
      // Arrange
      mockFs.existsSync = vi.fn(() => false);

      // Act
      controller.serveAuthTestPage(mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Fichier non trouvé',
        paths: expect.any(Array)
      });
    });
  });

  describe('serveAuthCallbackPage', () => {
    it('should serve auth-callback.html when file exists', () => {
      // Arrange
      const fileContent = '<html><body>Callback</body></html>';
      const filePath = join(__dirname, '..', 'public', 'auth-callback.html');
      
      mockFs.existsSync = vi.fn((path: string) => path === filePath);
      mockFs.readFileSync = vi.fn(() => fileContent);

      // Act
      controller.serveAuthCallbackPage(mockReply);

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockReply.type).toHaveBeenCalledWith('text/html');
      expect(mockReply.send).toHaveBeenCalledWith(fileContent);
    });

    it('should return 404 when file does not exist', () => {
      // Arrange
      mockFs.existsSync = vi.fn(() => false);

      // Act
      controller.serveAuthCallbackPage(mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Fichier non trouvé',
        paths: expect.any(Array)
      });
    });
  });
}); 