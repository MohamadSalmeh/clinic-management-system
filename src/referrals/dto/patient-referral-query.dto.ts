import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReferralStatus } from '../entities/referral.entity';
import { Type } from 'class-transformer';

export class PatientReferralQueryDto {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

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
}
