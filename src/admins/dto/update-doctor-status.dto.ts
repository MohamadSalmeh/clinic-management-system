import { IsEnum, IsOptional } from 'class-validator';
import { DoctorStatusUpdateAction } from '../interfaces/admin-doctor.interface';

export class UpdateDoctorStatusDto {
  @IsOptional()
  @IsEnum(DoctorStatusUpdateAction)
  status: DoctorStatusUpdateAction = DoctorStatusUpdateAction.INACTIVE;
}