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
    toClinicId?: number;
}

