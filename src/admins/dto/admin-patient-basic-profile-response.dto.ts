import { Expose, Type } from 'class-transformer';

export class AdminPatientBasicProfileUserDto {
  @Expose() id!: number;
  @Expose() firstName!: string;
  @Expose() fatherName!: string | null;
  @Expose() lastName!: string;
  @Expose() email!: string;
  @Expose() phone!: string | null;
  @Expose() gender!: string | null;
  @Expose() birthDate!: string | null;
  @Expose() status!: string | null;
  @Expose() avatarUrl!: string | null;
}

export class PatientBasicProfileResponseDto {
  @Expose() id!: number;
  @Expose() userId!: number;
  @Expose() maritalStatus!: string | null;
  @Expose() occupation!: string | null;
  @Expose() emergencyContactName!: string | null;
  @Expose() emergencyContactPhone!: string | null;
  @Expose() noShowCount!: number | null;

  @Expose()
  @Type(() => AdminPatientBasicProfileUserDto)
  user!: AdminPatientBasicProfileUserDto;
}