import { Expose, Type } from 'class-transformer';

export class AdminPatientMedicalHistoryDoctorDto {
  @Expose() id!: number;
  @Expose() fullName!: string;
  @Expose() specialization!: string | null;
}

export class AdminPatientMedicalHistoryAppointmentDto {
  @Expose() id!: number;
  @Expose() requestedDate!: string | null;
}

export class AdminPatientMedicalHistoryMedicineDto {
  @Expose() id!: number;
  @Expose() medicineName!: string | null;
  @Expose() dosage!: string | null;
  @Expose() frequency!: string | null;
}

export class AdminPatientMedicalHistoryAttachmentDto {
  @Expose() id!: number;
  @Expose() originalName!: string | null;
  @Expose() fileType!: string | null;
  @Expose() fileSize!: number | null;
  @Expose() createdAt!: string | null;
}

export class PatientMedicalHistoriesResponseDto {
  @Expose() id!: number;
  @Expose() diagnosis!: string | null;
  @Expose() treatmentPlan!: string | null;
  @Expose() doctorNotes!: string | null;
  @Expose() createdAt!: string | null;

  @Expose()
  @Type(() => AdminPatientMedicalHistoryAppointmentDto)
  appointment!: AdminPatientMedicalHistoryAppointmentDto | null;

  @Expose()
  @Type(() => AdminPatientMedicalHistoryDoctorDto)
  doctor!: AdminPatientMedicalHistoryDoctorDto | null;

  @Expose()
  @Type(() => AdminPatientMedicalHistoryMedicineDto)
  medicines!: AdminPatientMedicalHistoryMedicineDto[];

  @Expose()
  @Type(() => AdminPatientMedicalHistoryAttachmentDto)
  attachments!: AdminPatientMedicalHistoryAttachmentDto[];
}