import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../utils';
import { Lookup } from './entities/lookup.entity';
import { CreateLookupDto, LookupQueryDto, UpdateLookupDto } from './dto';
import { LookupsService } from './lookups.service';

@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Get()
  async findAll(@Query() query: LookupQueryDto): Promise<Lookup[]> {
    return this.lookupsService.findAll(query);
  }

  @Post()
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateLookupDto): Promise<Lookup> {
    return this.lookupsService.create(dto);
  }

  @Get(':id')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Lookup> {
    return this.lookupsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLookupDto,
  ): Promise<Lookup> {
    return this.lookupsService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleStatus(@Param('id', ParseIntPipe) id: number): Promise<Lookup> {
    return this.lookupsService.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.lookupsService.remove(id);
    return { message: 'Lookup deleted' };
  }
}
