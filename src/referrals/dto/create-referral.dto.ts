import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReferralType } from '../entities/referral.entity'; // أو حسب مسار الـ Entity عندك

export class CreateReferralDto {
  @IsNotEmpty()
  @IsInt()
  patientId!: number;

  @IsNotEmpty()
  @IsEnum(ReferralType)
  type!: ReferralType;

  // استخدام الاسم الحقيقي المتوافق مع الداتابيز والـ Entity
  @IsNotEmpty()
  @IsString()
  reason!: string; 

  @IsOptional()
  @IsInt()
  toDoctorId?: number;

  @IsOptional()
  @IsInt()
  toClinicId?: number;
}