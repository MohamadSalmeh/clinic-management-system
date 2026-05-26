import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateDoctorLeaveDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doctorProfileId?: number;

  @IsDateString()
  exceptionDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
