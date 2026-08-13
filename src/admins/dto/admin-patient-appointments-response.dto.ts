import { Expose, Type } from 'class-transformer';

export class AdminPatientAppointmentDoctorDto {
  @Expose() id!: number;
  @Expose() fullName!: string;
  @Expose() specialization!: string | null;
}

export class AdminPatientAppointmentClinicDto {
  @Expose() id!: number;
  @Expose() name!: string;
}

export class AdminPatientAppointmentPaymentDto {
  @Expose() id!: number;
  @Expose() amount!: number | null;
  @Expose() status!: string | null;
}

export class AdminPatientAppointmentQueueDto {
  @Expose() id!: number;
  @Expose() position!: number | null;
  @Expose() status!: string | null;
}

export class PatientAppointmentsResponseDto {
  @Expose() id!: number;
  @Expose() requestedDate!: string | null;
  @Expose() startTime!: string | null;
  @Expose() endTime!: string | null;
  @Expose() type!: string | null;
  @Expose() priority!: string | null;
  @Expose() status!: string | null;
  @Expose() reasonForVisit!: string | null;

  @Expose()
  @Type(() => AdminPatientAppointmentDoctorDto)
  doctor!: AdminPatientAppointmentDoctorDto | null;

  @Expose()
  @Type(() => AdminPatientAppointmentClinicDto)
  clinic!: AdminPatientAppointmentClinicDto | null;

  @Expose()
  @Type(() => AdminPatientAppointmentPaymentDto)
  payment!: AdminPatientAppointmentPaymentDto | null;

  @Expose()
  @Type(() => AdminPatientAppointmentQueueDto)
  queue!: AdminPatientAppointmentQueueDto | null;
}