import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationFilter } from './validation.filter';
import { ArgumentsHost } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

describe('ValidationFilter', () => {
  let filter: ValidationFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new ValidationFilter();
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test',
      method: 'POST',
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

  it('should be an instance of ValidationFilter', () => {
    expect(filter).toBeInstanceOf(ValidationFilter);
  });

  it('should catch BadRequestException and format validation errors', () => {
    const validationErrors = [
      {
        field: 'email',
        message: 'email must be an email',
      },
      {
        field: 'password',
        message: 'password must be longer than 6 characters',
      },
    ];

    const exception = new BadRequestException(validationErrors);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Validation failed',
      errors: validationErrors,
      data: null,
    });
  });

  it('should handle exception without validation errors', () => {
    const exception = new BadRequestException('General error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Validation failed',
      errors: 'General error',
      data: null,
    });
  });

  it('should include request path in response', () => {
    const exception = new BadRequestException([]);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.send).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Validation failed',
      errors: [],
      data: null,
    });
  });

  it('should include timestamp in response', () => {
    const exception = new BadRequestException([]);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.send).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Validation failed',
      errors: [],
      data: null,
    });
  });
}); 