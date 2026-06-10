import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportReason } from '../enums/report-status.enum'; // انتبه للمسار الجديد

export class ReportRatingDto {
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  explanation?: string;
}