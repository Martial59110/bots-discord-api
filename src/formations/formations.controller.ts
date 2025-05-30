import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query } from '@nestjs/common';
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
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('uuidGuild') uuidGuild?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.formationsService.findAll(pageNum, limitNum, search, uuidGuild);
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

  @Get('lookup')
  lookup(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.formationsService.lookupFormations(search, pageNum, limitNum);
  }
} 