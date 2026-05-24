import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DoctorScheduleType } from '../entities/doctor-schedule.entity';

export class DoctorScheduleSlotDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;

  @IsEnum(DoctorScheduleType)
  type!: DoctorScheduleType;

  @IsOptional()
  @IsString()
  notes?: string;
}
