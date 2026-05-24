import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../utils';
import { Clinic } from './entities/clinic.entity';
import { CreateClinicDto, UpdateClinicDto } from './dto';
import { ClinicsService } from './clinics.service';

@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  async findAll(): Promise<Clinic[]> {
    return this.clinicsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Clinic> {
    return this.clinicsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateClinicDto): Promise<Clinic> {
    return this.clinicsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClinicDto,
  ): Promise<Clinic> {
    return this.clinicsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Clinic> {
    return this.clinicsService.remove(id);
  }
}
