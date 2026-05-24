import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DoctorScheduleRequestStatus } from '../entities/doctor-schedule-request.entity';

export class UpdateDoctorScheduleRequestStatusDto {
  @IsEnum(DoctorScheduleRequestStatus)
  status!: DoctorScheduleRequestStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
