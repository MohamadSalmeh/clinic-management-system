import { IsEnum, IsOptional } from 'class-validator';
import { ReferralStatus } from '../entities/referral.entity';

export class PatientReferralQueryDto {
    @IsOptional()
    @IsEnum(ReferralStatus)
    status?: ReferralStatus;
}