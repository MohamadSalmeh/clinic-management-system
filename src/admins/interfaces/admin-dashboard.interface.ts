// filepath: c:\Users\hp\Desktop\projcet1\clinic-management-system\src\admins\interfaces\admin-dashboard.interface.ts
export enum DashboardRange {
  RANGE_7D = '7d',
  RANGE_30D = '30d',
  RANGE_12M = '12m',
}

export interface DashboardSummary {
  totalPatients: number;
  newPatientsThisMonth: number;
  activeDoctors: number;
  pendingScheduleRequests: number;
  todaysAppointments: number;
  liveQueueNow: number;
  clinicsNeedingAttention: number;
  monthlyRevenue: number;
  heldPayments: number;
}

export interface DashboardTrendItem {
  period: string;
  totalAppointments: number;
  completedAppointments: number;
  missedOrCancelledAppointments: number;
  completedRevenue: number;
}

export interface AppointmentStatusBreakdownItem {
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  count: number;
}

export interface TopRatedDoctor {
  doctorId: string | number;
  fullName: string;
  specialization: string | null;
  averageRating: number;
  ratingCount: number;
  status: string;
}

export interface AdminDashboardData {
  range: DashboardRange;
  summary: DashboardSummary;
  trends: DashboardTrendItem[];
  appointmentStatusBreakdown: AppointmentStatusBreakdownItem[];
  topRatedDoctors: TopRatedDoctor[];
}