import { Expose, Type } from 'class-transformer';

export class AdminPatientProfileLogChangedByDto {
  @Expose() id!: number;
  @Expose() firstName!: string;
  @Expose() lastName!: string;
  @Expose() role!: string;
}

export class PatientProfileLogsResponseDto {
  @Expose() id!: number;
  @Expose() fieldName!: string | null;
  @Expose() oldValue!: any | null;
  @Expose() newValue!: any | null;
  @Expose() changeReason!: string | null;
  @Expose() appointmentId!: number | null;
  @Expose() createdAt!: string | null;

  @Expose()
  @Type(() => AdminPatientProfileLogChangedByDto)
  changedBy!: AdminPatientProfileLogChangedByDto | null;
}