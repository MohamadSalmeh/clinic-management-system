import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { DoctorAdminLogType } from '../entities/doctor-admin-log.entity';

export class DoctorAdminLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doctorProfileId?: number;

  @IsOptional()
  @IsEnum(DoctorAdminLogType)
  type?: DoctorAdminLogType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
