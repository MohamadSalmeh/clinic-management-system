import { IsIn } from 'class-validator';
import { DoctorProfileStatus } from '../../users/enums/doctor-profile-status.enum';

export class UpdateDoctorStatusDto {
  @IsIn([
    DoctorProfileStatus.ACTIVE,
    DoctorProfileStatus.INACTIVE,
  ])
  status!: DoctorProfileStatus.ACTIVE | DoctorProfileStatus.INACTIVE;
}