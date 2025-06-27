import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampusesController } from './campuses.controller';
import { CampusesService } from './campuses.service';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';

const mockCampusService = {
  create: vi.fn(),
  findAll: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

describe('CampusesController', () => {
  let controller: CampusesController;

  beforeEach(() => {
    controller = new CampusesController(mockCampusService as unknown as CampusesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a new campus', async () => {
    const dto: CreateCampusDto = {
      name: 'Test Campus',
    };
    const result = { uuid: '123e4567-e89b-12d3-a456-426614174000', ...dto };
    mockCampusService.create.mockResolvedValue(result);
    expect(await controller.create(dto)).toEqual(result);
    expect(mockCampusService.create).toHaveBeenCalledWith(dto);
  });

  it('should return an array of campuses', async () => {
    const result = [{ uuid: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Campus' }];
    mockCampusService.findAll.mockResolvedValue(result);
    expect(await controller.findAll()).toEqual({ data: result });
    expect(mockCampusService.findAll).toHaveBeenCalled();
  });

  it('should return a single campus', async () => {
    const result = { uuid: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Campus' };
    mockCampusService.findOne.mockResolvedValue(result);
    expect(await controller.findOne('123e4567-e89b-12d3-a456-426614174000')).toEqual(result);
    expect(mockCampusService.findOne).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should update a campus', async () => {
    const dto: UpdateCampusDto = { name: 'Updated Campus' };
    const result = { uuid: '123e4567-e89b-12d3-a456-426614174000', name: 'Updated Campus' };
    mockCampusService.update.mockResolvedValue(result);
    expect(await controller.update('123e4567-e89b-12d3-a456-426614174000', dto)).toEqual(result);
    expect(mockCampusService.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', dto);
  });

  it('should delete a campus', async () => {
    mockCampusService.remove.mockResolvedValue({ affected: 1 });
    expect(await controller.remove('123e4567-e89b-12d3-a456-426614174000')).toEqual({ affected: 1 });
    expect(mockCampusService.remove).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });
});

