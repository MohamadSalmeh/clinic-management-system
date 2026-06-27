import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSystemSettingDto {
  @IsInt()
  @Min(0)
  cancelBeforeDays!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  lateCancelPenaltyPercent!: number;

  @IsInt()
  @Min(1)
  maxNoShowCount!: number;

  @IsInt()
  @Min(5)
  initialVisitDuration!: number;

  @IsInt()
  @Min(5)
  returnVisitDuration!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  consultationDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  followUpDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  operationDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12) // كحد أقصى 12 ساعة
  checkinBeforeHours?: number;
}
