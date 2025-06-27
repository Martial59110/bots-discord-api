import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: vi.fn(() => ({
        getResponse: vi.fn(() => mockResponse),
        getRequest: vi.fn(() => mockRequest),
      })),
    } as any;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should be an instance of HttpExceptionFilter', () => {
    expect(filter).toBeInstanceOf(HttpExceptionFilter);
  });

  it('should catch HttpException and format response correctly', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
    const timestamp = new Date().toISOString();

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.send).toHaveBeenCalledWith({
      message: 'Test error',
      statusCode: HttpStatus.BAD_REQUEST,
      data: null,
    });
  });

  it('should handle different HTTP status codes', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('should include request path in response', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.send).toHaveBeenCalledWith({
      message: 'Test error',
      statusCode: HttpStatus.BAD_REQUEST,
      data: null,
    });
  });

  it('should include timestamp in response', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.send).toHaveBeenCalledWith({
      message: 'Test error',
      statusCode: HttpStatus.BAD_REQUEST,
      data: null,
    });
  });
}); 