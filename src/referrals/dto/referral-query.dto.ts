import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReferralStatus, ReferralType } from '../entities/referral.entity';

export class ReferralQueryDto {
    @IsOptional()
    @IsEnum(ReferralStatus)
    status?: ReferralStatus;

    @IsOptional()
    @IsEnum(ReferralType)
    type?: ReferralType;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    limit?: string;
}