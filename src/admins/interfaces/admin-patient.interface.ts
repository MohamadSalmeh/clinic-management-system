// ========== PHASE 2: Patient Medical Details (موجود مبارح) ==========
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

// ========== PHASE 3: Admin Patient Management ==========

export interface PatientBasicProfile {
  patientProfile: any;
  user: any;
}

export interface PatientAppointmentsResponse {
  appointments: Array<{
    id: number;
    requestedDate: string | null;
    startTime: string | null;
    endTime: string | null;
    type: string | null;
    priority: string | null;
    status: string | null;
    reasonForVisit: string | null;
    doctor: any | null;
    clinic: any | null;
    payment: any | null;
    queue: any | null;
  }>;
}

export interface PatientMedicalProfileResponse {
  medicalProfile: any;
}

export interface PatientMedicalHistoriesResponse {
  medicalHistories: Array<{
    id: number;
    diagnosis: string | null;
    treatmentPlan: string | null;
    doctorNotes: string | null;
    createdAt: string | null;
    appointment: any | null;
    doctor: any | null;
    medicines: any[];
    attachments: any[];
  }>;
}

export interface PatientProfileLogsResponse {
  logs: Array<{
    id: number;
    fieldName: string | null;
    oldValue: any | null;
    newValue: any | null;
    changeReason: string | null;
    appointmentId: number | null;
    createdAt: string | null;
    changedBy: any | null;
  }>;
}