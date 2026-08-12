export interface AdminPatientMedicalDetails {
  patientProfile: any;
  user: any;
  medicalProfile: any | null;
  medicalHistory: Array<{
    id: number;
    doctor: any | null;
    clinic: any | null;
    prescribedMedicines: any[];
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  appointments: Array<{
    id: number;
    requestedDate: string | null;
    status: string | null;
    clinic: any | null;
    doctor: any | null;
  }>;
}