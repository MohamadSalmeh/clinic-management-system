import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ReferralsService, PaginatedResponse } from './referrals.service';
import {
  CreateReferralDto,
  ReferralQueryDto,
  PatientReferralQueryDto,
  CancelReferralDto, // استيراد الـ DTO الجديد هنا لتأمين البيانات الواردة للأدمن
} from './dto';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { Referral } from './entities/referral.entity';

@Controller('referrals')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ==========================================
  // 1. صلاحيات الطبيب (Doctor Operations)
  // ==========================================

  @Post()
  @Roles(UserRole.DOCTOR)
  async create(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: CreateReferralDto,
  ): Promise<Referral> {
    return this.referralsService.createReferral(user, dto);
  }

  @Get('doctor/sent')
  @Roles(UserRole.DOCTOR)
  async getSent(
    @CurrentUser() user: ActiveUserData,
    @Query() queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    return this.referralsService.getSentReferrals(user, queryDto);
  }

  @Get('doctor/received')
  @Roles(UserRole.DOCTOR)
  async getReceived(
    @CurrentUser() user: ActiveUserData,
    @Query() queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    return this.referralsService.getReceivedReferrals(user, queryDto);
  }

  // ==========================================
  // 2. صلاحيات المريض (Patient Operations)
  // ==========================================

  @Get('my-referrals')
  @Roles(UserRole.PATIENT)
  async getMyReferrals(
    @CurrentUser() user: ActiveUserData,
    @Query() queryDto: PatientReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    return this.referralsService.getMyReferrals(user, queryDto);
  }

  @Get('my-active')
  @Roles(UserRole.PATIENT)
  async getMyActive(@CurrentUser() user: ActiveUserData): Promise<Referral[]> {
    return this.referralsService.getMyActiveReferrals(user);
  }

  // ==========================================
  // 3. صلاحيات الأدمن (Admin Operations)
  // ==========================================

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async adminFindAll(
    @Query() queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    return this.referralsService.findAllReferralsForAdmin(queryDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Referral> {
    return this.referralsService.findOne(id);
  }

  /**
   * إلغاء التحويل الطبي بواسطة الأدمن مع تمرير الـ DTO الجديد
   * لضمان التحقق من مدخلات الـ Cancellation Reason ومنع النصوص الفارغة
   */
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN)
  async cancelByAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelReferralDto, // تمرير الـ DTO بالكامل هنا بدلاً من عزل البارامتر كـ text
  ): Promise<Referral> {
    return this.referralsService.cancelReferralByAdmin(id, dto);
  }
}
