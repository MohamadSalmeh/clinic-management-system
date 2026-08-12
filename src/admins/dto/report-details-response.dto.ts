import { Expose, Type } from 'class-transformer';
import { AdminDoctorDto, AdminUserDto } from './patient-medical-details-response.dto';

export class ReportDetailsResponseDto {
  @Expose() report!: Record<string, unknown>;

  @Expose()
  @Type(() => AdminUserDto)
  reporterPatient!: AdminUserDto | null;

  @Expose()
  @Type(() => AdminDoctorDto)
  rating!: Record<string, unknown> | null;
}