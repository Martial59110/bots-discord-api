import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { FormationsService } from './formations.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';

@Controller('formations')
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @Post()
  create(@Body() createFormationDto: CreateFormationDto) {
    return this.formationsService.create(createFormationDto);
  }

  @Get()
  findAll() {
    return this.formationsService.findAll();
  }

  @Get(':uuidFormation')
  findOne(@Param('uuidFormation') uuidFormation: string) {
    return this.formationsService.findOne(uuidFormation);
  }

  @Patch(':uuidFormation')
  @Put(':uuidFormation')
  update(
    @Param('uuidFormation') uuidFormation: string,
    @Body() updateFormationDto: UpdateFormationDto,
  ) {
    return this.formationsService.update(uuidFormation, updateFormationDto);
  }

  @Delete(':uuidFormation')
  remove(@Param('uuidFormation') uuidFormation: string) {
    return this.formationsService.remove(uuidFormation);
  }

  @Patch(':uuidFormation/channels-order')
  async updateChannelsOrder(
    @Param('uuidFormation') uuidFormation: string,
    @Body() body: { channels: { uuid: string, channelPosition: number }[] }
  ) {
    return this.formationsService.updateChannelsOrder(uuidFormation, body.channels);
  }

  @Patch(':uuidFormation/threads-order')
  async updateThreadsOrder(
    @Param('uuidFormation') uuidFormation: string,
    @Body() body: { threads: { uuid: string, threadPosition: number }[] }
  ) {
    return this.formationsService.updateThreadsOrder(uuidFormation, body.threads);
  }
} 