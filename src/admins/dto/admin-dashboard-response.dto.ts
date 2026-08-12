// filepath: c:\Users\hp\Desktop\projcet1\clinic-management-system\src\admins\dto\admin-dashboard-response.dto.ts
import { Expose, Type } from 'class-transformer';
import {
  AppointmentStatusBreakdownItem,
  DashboardRange,
  DashboardSummary,
  DashboardTrendItem,
  TopRatedDoctor,
} from '../interfaces/admin-dashboard.interface';

export class DashboardSummaryDto implements DashboardSummary {
  @Expose()
  totalPatients: number = 0;

  @Expose()
  newPatientsThisMonth: number = 0;

  @Expose()
  activeDoctors: number = 0;

  @Expose()
  pendingScheduleRequests: number = 0;

  @Expose()
  todaysAppointments: number = 0;

  @Expose()
  liveQueueNow: number = 0;

  @Expose()
  clinicsNeedingAttention: number = 0;

  @Expose()
  monthlyRevenue: number = 0;

  @Expose()
  heldPayments: number = 0;
}

export class DashboardTrendItemDto implements DashboardTrendItem {
  @Expose()
  period: string = '';

  @Expose()
  totalAppointments: number = 0;

  @Expose()
  completedAppointments: number = 0;

  @Expose()
  missedOrCancelledAppointments: number = 0;

  @Expose()
  completedRevenue: number = 0;
}

export class AppointmentStatusBreakdownItemDto
  implements AppointmentStatusBreakdownItem
{
  @Expose()
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' = 'confirmed';

  @Expose()
  count: number = 0;
}

export class TopRatedDoctorDto implements TopRatedDoctor {
  @Expose()
  doctorId: string | number = 0;

  @Expose()
  fullName: string = '';

  @Expose()
  specialization: string | null = null;

  @Expose()
  averageRating: number = 0;

  @Expose()
  ratingCount: number = 0;

  @Expose()
  status: string = '';
}

export class AdminDashboardResponseDto {
  @Expose()
  range: DashboardRange = DashboardRange.RANGE_30D;

  @Expose()
  @Type(() => DashboardSummaryDto)
  summary: DashboardSummaryDto = new DashboardSummaryDto();

  @Expose()
  @Type(() => DashboardTrendItemDto)
  trends: DashboardTrendItemDto[] = [];

  @Expose()
  @Type(() => AppointmentStatusBreakdownItemDto)
  appointmentStatusBreakdown: AppointmentStatusBreakdownItemDto[] = [];

  @Expose()
  @Type(() => TopRatedDoctorDto)
  topRatedDoctors: TopRatedDoctorDto[] = [];
}