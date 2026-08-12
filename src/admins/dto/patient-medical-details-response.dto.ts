import { Expose, Type } from 'class-transformer';

export class AdminUserDto {
  @Expose() id!: number;
  @Expose() firstName!: string;
  @Expose() lastName!: string;
  @Expose() email!: string;
}

export class AdminDoctorDto {
  @Expose() id!: number;
  @Expose() fullName?: string;
  @Expose() specialization?: string | null;
}

export class AdminClinicDto {
  @Expose() id!: number;
  @Expose() name!: string;
  @Expose() status?: string;
}

export class AdminPrescribedMedicineDto {
  @Expose() id!: number;
  @Expose() name?: string;
  @Expose() dosage?: string | null;
  @Expose() frequency?: string | null;
}

export class AdminMedicalHistoryDto {
  @Expose() id!: number;

  @Expose()
  @Type(() => AdminDoctorDto)
  doctor!: AdminDoctorDto | null;

  @Expose()
  @Type(() => AdminClinicDto)
  clinic!: AdminClinicDto | null;

  @Expose()
  @Type(() => AdminPrescribedMedicineDto)
  prescribedMedicines!: AdminPrescribedMedicineDto[];

  @Expose() createdAt!: string | null;
  @Expose() updatedAt!: string | null;
}

export class AdminAppointmentDto {
  @Expose() id!: number;
  @Expose() requestedDate!: string | null;
  @Expose() status!: string | null;

  @Expose()
  @Type(() => AdminClinicDto)
  clinic!: AdminClinicDto | null;

  @Expose()
  @Type(() => AdminDoctorDto)
  doctor!: AdminDoctorDto | null;
}

export class PatientMedicalDetailsResponseDto {
  @Expose() patientProfile!: Record<string, unknown>;

  @Expose()
  @Type(() => AdminUserDto)
  user!: AdminUserDto;

  @Expose() medicalProfile!: Record<string, unknown> | null;

  @Expose()
  @Type(() => AdminMedicalHistoryDto)
  medicalHistory!: AdminMedicalHistoryDto[];

  @Expose()
  @Type(() => AdminAppointmentDto)
  appointments!: AdminAppointmentDto[];
}