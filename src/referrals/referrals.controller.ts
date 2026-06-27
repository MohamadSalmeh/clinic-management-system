import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ReferralsService, PaginatedResponse } from './referrals.service'; // استيراد الـ Interface هنا
import { CreateReferralDto, ReferralQueryDto, PatientReferralQueryDto } from './dto';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards'; 
import { CurrentUser, Roles } from '../common/decorators'; 
import { ActiveUserData, UserRole } from '../utils';
import { Referral } from './entities/referral.entity';

@Controller('referrals')
@UseGuards(AuthRolesGuard, VerifiedGuard) 
export class ReferralsController {
    constructor(private readonly referralsService: ReferralsService) {}

    // --- صلاحيات الطبيب ---
    @Post()
    @Roles(UserRole.DOCTOR)
    async create(@CurrentUser() user: ActiveUserData, @Body() dto: CreateReferralDto): Promise<Referral> {
        return this.referralsService.createReferral(user, dto);
    }

    @Get('doctor/sent')
    @Roles(UserRole.DOCTOR)
    async getSent(
        @CurrentUser() user: ActiveUserData, 
        @Query() queryDto: ReferralQueryDto
    ): Promise<PaginatedResponse<Referral>> { // تحديد الـ Return Type الصريح
        return this.referralsService.getSentReferrals(user, queryDto);
    }

    @Get('doctor/received')
    @Roles(UserRole.DOCTOR)
    async getReceived(
        @CurrentUser() user: ActiveUserData, 
        @Query() queryDto: ReferralQueryDto
    ): Promise<PaginatedResponse<Referral>> { // تحديد الـ Return Type الصريح
        return this.referralsService.getReceivedReferrals(user, queryDto);
    }

    // --- صلاحيات المريض ---
    @Get('my-referrals')
    @Roles(UserRole.PATIENT)
    async getMyReferrals(
        @CurrentUser() user: ActiveUserData, 
        @Query() queryDto: PatientReferralQueryDto
    ): Promise<PaginatedResponse<Referral>> { // تحديد الـ Return Type الصريح
        return this.referralsService.getMyReferrals(user, queryDto);
    }

    @Get('my-active')
    @Roles(UserRole.PATIENT)
    async getMyActive(@CurrentUser() user: ActiveUserData): Promise<Referral[]> {
        return this.referralsService.getMyActiveReferrals(user);
    }

    // --- صلاحيات الأدمن ---
    @Get('admin/all')
    @Roles(UserRole.ADMIN)
    async adminFindAll(@Query() queryDto: ReferralQueryDto): Promise<PaginatedResponse<Referral>> { // تحديد الـ Return Type الصريح
        return this.referralsService.findAllReferralsForAdmin(queryDto);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<Referral> {
        return this.referralsService.findOne(id);
    }

    @Patch(':id/cancel')
    @Roles(UserRole.ADMIN)
    async cancelByAdmin(@Param('id', ParseIntPipe) id: number, @Body('reason') reason: string): Promise<Referral> {
        return this.referralsService.cancelReferralByAdmin(id, reason);
    }
}