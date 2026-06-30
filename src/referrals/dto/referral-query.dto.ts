import { IsEnum, IsOptional, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ReferralStatus, ReferralType } from '../entities/referral.entity';

export class ReferralQueryDto {
    @IsOptional()
    @IsEnum(ReferralStatus)
    status?: ReferralStatus;

    @IsOptional()
    @IsEnum(ReferralType)
    type?: ReferralType;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    patientId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    fromDoctorId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    toDoctorId?: number; // ✅ جديد: فلترة حسب الدكتور المستهدف

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    toClinicId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    clinicId?: number; // ✅ جديد: اسم بديل لـ toClinicId

    @IsOptional()
    @IsString()
    search?: string; // ✅ بحث عام

    // ✅ جديد: فلترة حسب تخصص الدكتور (من الـ DoctorProfile)
    @IsOptional()
    @IsString()
    specialization?: string;

    // ✅ جديد: فلترة حسب العيادة (Clinic Name)
    @IsOptional()
    @IsString()
    clinicName?: string;

    // ✅ جديد: فلترة حسب اسم المريض
    @IsOptional()
    @IsString()
    patientName?: string;

    // ✅ جديد: فلترة حسب اسم الدكتور المرسل
    @IsOptional()
    @IsString()
    fromDoctorName?: string;
}