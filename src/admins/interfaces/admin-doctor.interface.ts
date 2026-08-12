export enum DoctorStatusUpdateAction {
  INACTIVE = 'inactive',
}

export interface AdminDoctorStatusUpdateResult {
  success: boolean;
  message: string;
  doctorId: number;
  status: string;
}