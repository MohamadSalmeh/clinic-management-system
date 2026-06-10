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
import { RatingsService } from './ratings.service';
import { CreateRatingDto, RatingQueryDto, ReportRatingDto } from './dto';
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { RatingStatus } from './enums/rating-status.enum';
import { publicDecrypt } from 'crypto';

@Controller('ratings')
@UseGuards(AuthRolesGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @Roles(UserRole.PATIENT)
  async createRating(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: CreateRatingDto,
  ) {
    return await this.ratingsService.createRating(user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.PATIENT)
  async updateRating(
    @Param('id', ParseIntPipe) ratingId: number,
    @CurrentUser() user: ActiveUserData,
    @Body() dto: CreateRatingDto,
  ) {
    return await this.ratingsService.updateRating(ratingId, user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PATIENT)
  async deleteRating(
    @Param('id', ParseIntPipe) ratingId: number,
    @CurrentUser() user: ActiveUserData,
  ) {
    return await this.ratingsService.deleteRating(ratingId, user.sub);
  }

  @Post(':id/report')
  @Roles(UserRole.PATIENT)
  async reportRating(
    @Param('id', ParseIntPipe) ratingId: number,
    @CurrentUser() user: ActiveUserData,
    @Body() dto: ReportRatingDto,
  ) {
    return await this.ratingsService.reportRating(ratingId, user.sub, dto);
  }

  @Get('doctor/:doctorId')
  @Public()
  async getDoctorRatings(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query() query: RatingQueryDto,
  ) {
    return await this.ratingsService.getDoctorRatings(doctorId, query);
  }

  @Get('my-reviews')
  @Roles(UserRole.PATIENT)
  async getPatientOwnRatings(
    @CurrentUser() user: ActiveUserData,
    @Query() query: RatingQueryDto,
  ) {
    return await this.ratingsService.getPatientOwnRatings(user.sub, query);
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async adminGetAllRatings(@Query() query: any) {
    return await this.ratingsService.adminGetAllRatings(query);
  }

  @Patch('admin/:id/status')
  @Roles(UserRole.ADMIN)
  async adminUpdateRatingStatus(
    @Param('id', ParseIntPipe) ratingId: number,
    @Body('status') status: RatingStatus,
  ) {
    return await this.ratingsService.adminUpdateRatingStatus(ratingId, status);
  }

  @Get('admin/reports')
  @Roles(UserRole.ADMIN)
  async adminGetAllReports(@Query() query: any) {
    return await this.ratingsService.adminGetAllReports(query);
  }

  @Patch('admin/reports/:id/resolve')
  @Roles(UserRole.ADMIN)
  async adminResolveReport(
    @Param('id', ParseIntPipe) reportId: number,
    @CurrentUser() user: ActiveUserData,
    @Body('action') action: 'accept' | 'dismiss',
  ) {
    return await this.ratingsService.adminResolveReport(
      reportId,
      user.sub,
      action,
    );
  }
}
