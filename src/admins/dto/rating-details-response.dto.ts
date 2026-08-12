import { Expose, Type } from 'class-transformer';
import { AdminAppointmentDto, AdminDoctorDto, AdminUserDto } from './patient-medical-details-response.dto';

export class RatingDetailsResponseDto {
  @Expose() rating!: Record<string, unknown>;

  @Expose()
  @Type(() => AdminUserDto)
  patientProfile!: AdminUserDto | null;

  @Expose()
  @Type(() => AdminDoctorDto)
  doctorProfile!: AdminDoctorDto | null;

  @Expose()
  @Type(() => AdminAppointmentDto)
  appointment!: AdminAppointmentDto | null;
}