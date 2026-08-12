import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  nowDate,
  startOfDay,
  endOfDay,
  toDateOnly,
  toDateString,
} from '../common/utils/date-utils';
import {
  DashboardRange,
  AdminDashboardData,
  DashboardTrendItem,
  AppointmentStatusBreakdownItem,
  TopRatedDoctor,
} from './interfaces/admin-dashboard.interface';
import { Appointment } from '../appointments/entities/appointment.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Queue } from '../queues/entities/queue.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DoctorScheduleRequest } from '../doctor-schedules/entities/doctor-schedule-request.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { DoctorProfileStatus } from '../users/enums/doctor-profile-status.enum';
import { ClinicStatus } from '../clinics/enums/clinic-status.enum';
import { QueueStatus } from '../queues/enums/queue-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { DoctorScheduleRequestStatus } from '../doctor-schedules/entities/doctor-schedule-request.entity';
import { RatingStatus } from '../ratings/enums/rating-status.enum';

type TrendPeriodType = 'day' | 'month';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(DoctorScheduleRequest)
    private readonly doctorScheduleRequestRepository: Repository<DoctorScheduleRequest>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
  ) {}

  /**
   * Returns aggregated dashboard statistics for the admin panel.
   */
  public async getDashboardData(
    range: DashboardRange,
  ): Promise<AdminDashboardData> {
    try {
      const dashboardRange = range ?? DashboardRange.RANGE_30D;
      const today = toDateOnly(nowDate());
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const currentMonthStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const currentMonthEnd = endOfDay(
        new Date(today.getFullYear(), today.getMonth() + 1, 0),
      );

      // 1. Total Patients
      const totalPatients = await this.patientProfileRepository.count();

      // 2. New Patients This Month
      const newPatientsThisMonth = await this.patientProfileRepository
        .createQueryBuilder('patient')
        .where('patient.created_at BETWEEN :start AND :end', {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
        .getCount();

      // 3. Active Doctors
      const activeDoctors = await this.doctorProfileRepository.count({
        where: {
          isApproved: true,
          status: DoctorProfileStatus.ACTIVE,
        },
      });

      // 4. Pending Schedule Requests
      const pendingScheduleRequests =
        await this.doctorScheduleRequestRepository.count({
          where: {
            status: DoctorScheduleRequestStatus.PENDING,
          },
        });

      // 5. Today's Appointments
      const todaysAppointments = await this.appointmentRepository.count({
        where: {
          requestedDate: Between(todayStart, todayEnd),
          status: In(['confirmed', 'in_progress', 'completed', 'no_show']),
        },
      });

      // 6. Live Queue Now
      const liveQueueNow = await this.queueRepository.count({
        where: {
          created_at: Between(todayStart, todayEnd),
          status: In([
            QueueStatus.WAITING,
            QueueStatus.CALLING,
            QueueStatus.IN_PROGRESS,
          ]),
        },
      });

      // 7. Clinics Needing Attention
      const clinicsNeedingAttention = await this.clinicRepository.count({
        where: {
          status: In([ClinicStatus.CLOSED, ClinicStatus.MAINTENANCE]),
        },
      });

      // 8. Monthly Revenue
      const monthlyRevenueRaw = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'monthlyRevenue')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.paid_at BETWEEN :start AND :end', {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
        .getRawOne<{ monthlyRevenue: string | number | null }>();

      // 9. Held Payments
      const heldPayments = await this.paymentRepository.count({
        where: {
          status: PaymentStatus.HELD,
        },
      });

      // 10. Get Trends Window
      const { start, end, periodType, periods } =
        await this.getTrendWindow(dashboardRange);

      // 11. Fetch all data in parallel
      const [
        appointmentTrendRows,
        paymentTrendRows,
        statusRows,
        topRatedDoctors,
      ] = await Promise.all([
        this.getAppointmentTrendRows(start, end, periodType),
        this.getPaymentTrendRows(start, end, periodType),
        this.getAppointmentStatusRows(start, end),
        this.getTopRatedDoctors(),
      ]);

      // 12. Build Trends and Breakdown
      const trends = await this.buildTrends(
        periods,
        periodType,
        appointmentTrendRows,
        paymentTrendRows,
      );
      const appointmentStatusBreakdown =
        await this.buildStatusBreakdown(statusRows);

      return {
        range: dashboardRange,
        summary: {
          totalPatients: Number(totalPatients ?? 0),
          newPatientsThisMonth: Number(newPatientsThisMonth ?? 0),
          activeDoctors: Number(activeDoctors ?? 0),
          pendingScheduleRequests: Number(pendingScheduleRequests ?? 0),
          todaysAppointments: Number(todaysAppointments ?? 0),
          liveQueueNow: Number(liveQueueNow ?? 0),
          clinicsNeedingAttention: Number(clinicsNeedingAttention ?? 0),
          monthlyRevenue: Number(monthlyRevenueRaw?.monthlyRevenue ?? 0),
          heldPayments: Number(heldPayments ?? 0),
        },
        trends,
        appointmentStatusBreakdown,
        topRatedDoctors,
      };
    } catch (error) {
      this.logger.error(
        'Failed to build admin dashboard data',
        error instanceof Error ? error.stack : undefined,
      );

      return {
        range: range ?? DashboardRange.RANGE_30D,
        summary: {
          totalPatients: 0,
          newPatientsThisMonth: 0,
          activeDoctors: 0,
          pendingScheduleRequests: 0,
          todaysAppointments: 0,
          liveQueueNow: 0,
          clinicsNeedingAttention: 0,
          monthlyRevenue: 0,
          heldPayments: 0,
        },
        trends: [],
        appointmentStatusBreakdown: await this.getEmptyStatusBreakdown(),
        topRatedDoctors: [],
      };
    }
  }

  private async getTrendWindow(range: DashboardRange): Promise<{
    start: Date;
    end: Date;
    periodType: TrendPeriodType;
    periods: Date[];
  }> {
    const today = toDateOnly(nowDate());

    if (range === DashboardRange.RANGE_12M) {
      const firstMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 11,
        1,
      );
      const periods: Date[] = [];

      for (let i = 0; i < 12; i += 1) {
        periods.push(
          new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1),
        );
      }

      return {
        start: firstMonth,
        end: endOfDay(nowDate()),
        periodType: 'month',
        periods,
      };
    }

    const days = range === DashboardRange.RANGE_7D ? 7 : 30;
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));

    const periods: Date[] = [];
    for (let i = 0; i < days; i += 1) {
      const nextDay = new Date(start);
      nextDay.setDate(start.getDate() + i);
      periods.push(nextDay);
    }

    return {
      start: startOfDay(start),
      end: endOfDay(nowDate()),
      periodType: 'day',
      periods,
    };
  }

  private async getAppointmentTrendRows(
    start: Date,
    end: Date,
    periodType: TrendPeriodType,
  ): Promise<
    Array<{
      period: string;
      totalAppointments: string | number;
      completedAppointments: string | number;
      missedOrCancelledAppointments: string | number;
    }>
  > {
    // ✅ PostgreSQL: استخدام TO_CHAR بدلاً من DATE_FORMAT
    const periodExpression =
      periodType === 'month'
        ? "TO_CHAR(appointment.requested_date, 'YYYY-MM')"
        : "TO_CHAR(appointment.requested_date, 'YYYY-MM-DD')";

    return this.appointmentRepository
      .createQueryBuilder('appointment')
      .select(periodExpression, 'period')
      .addSelect('COUNT(appointment.id)', 'totalAppointments')
      .addSelect(
        `SUM(CASE WHEN appointment.status = 'completed' THEN 1 ELSE 0 END)`,
        'completedAppointments',
      )
      .addSelect(
        `SUM(CASE WHEN appointment.status IN ('cancelled', 'no_show') THEN 1 ELSE 0 END)`,
        'missedOrCancelledAppointments',
      )
      .where('appointment.requested_date BETWEEN :start AND :end', {
        start,
        end,
      })
      .groupBy('period')
      .getRawMany();
  }

  private async getPaymentTrendRows(
    start: Date,
    end: Date,
    periodType: TrendPeriodType,
  ): Promise<Array<{ period: string; completedRevenue: string | number }>> {
    // ✅ PostgreSQL: استخدام TO_CHAR بدلاً من DATE_FORMAT
    const periodExpression =
      periodType === 'month'
        ? "TO_CHAR(payment.paid_at, 'YYYY-MM')"
        : "TO_CHAR(payment.paid_at, 'YYYY-MM-DD')";

    return this.paymentRepository
      .createQueryBuilder('payment')
      .select(periodExpression, 'period')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'completedRevenue')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paid_at BETWEEN :start AND :end', { start, end })
      .groupBy('period')
      .getRawMany();
  }

  private async getAppointmentStatusRows(
    start: Date,
    end: Date,
  ): Promise<Array<{ status: string; count: string | number }>> {
    return this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('appointment.status', 'status')
      .addSelect('COUNT(appointment.id)', 'count')
      .where('appointment.requested_date BETWEEN :start AND :end', {
        start,
        end,
      })
      .andWhere('appointment.status IN (:...statuses)', {
        statuses: [
          'confirmed',
          'in_progress',
          'completed',
          'cancelled',
          'no_show',
        ],
      })
      .groupBy('appointment.status')
      .orderBy('appointment.status', 'ASC')
      .getRawMany();
  }

  private async getTopRatedDoctors(): Promise<TopRatedDoctor[]> {
    try {
      const rows = await this.ratingRepository
        .createQueryBuilder('rating')
        .innerJoin('rating.doctorProfile', 'doctor')
        .innerJoin('doctor.user', 'user')
        .select('doctor.id', 'doctorId')
        .addSelect(
          "TRIM(CONCAT(COALESCE(user.first_name, ''), ' ', COALESCE(user.last_name, '')))",
          'fullName',
        )
        .addSelect('doctor.specialization', 'specialization')
        .addSelect('COALESCE(AVG(rating.score), 0)', 'averageRating')
        .addSelect('COUNT(rating.id)', 'ratingCount')
        .addSelect('doctor.status', 'status')
        .where('rating.status = :visibleStatus', {
          visibleStatus: RatingStatus.VISIBLE,
        })
        .andWhere('doctor.is_approved = :approved', { approved: true })
        .andWhere('doctor.status = :doctorStatus', {
          doctorStatus: DoctorProfileStatus.ACTIVE,
        })
        .groupBy('doctor.id')
        .addGroupBy('user.first_name')
        .addGroupBy('user.last_name')
        .addGroupBy('doctor.specialization')
        .addGroupBy('doctor.status')
        // ✅ PostgreSQL: استخدام علامات التنصيص المزدوجة حول الـ Aliases
        .orderBy('"averageRating"', 'DESC')
        .addOrderBy('"ratingCount"', 'DESC')
        .limit(5)
        .getRawMany<{
          doctorId: string | number;
          fullName: string;
          specialization: string | null;
          averageRating: string | number;
          ratingCount: string | number;
          status: string;
        }>();

      return rows.map((row) => ({
        doctorId: row.doctorId,
        fullName: row.fullName?.trim() || '',
        specialization: row.specialization ?? null,
        averageRating: Number(row.averageRating ?? 0),
        ratingCount: Number(row.ratingCount ?? 0),
        status: row.status,
      }));
    } catch (error) {
      this.logger.error(
        'Failed to load top rated doctors',
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  private async buildTrends(
    periods: Date[],
    periodType: TrendPeriodType,
    appointmentRows: Array<{
      period: string;
      totalAppointments: string | number;
      completedAppointments: string | number;
      missedOrCancelledAppointments: string | number;
    }>,
    paymentRows: Array<{ period: string; completedRevenue: string | number }>,
  ): Promise<DashboardTrendItem[]> {
    const appointmentMap = new Map<
      string,
      {
        totalAppointments: number;
        completedAppointments: number;
        missedOrCancelledAppointments: number;
      }
    >();
    const paymentMap = new Map<string, number>();

    for (const row of appointmentRows) {
      appointmentMap.set(row.period, {
        totalAppointments: Number(row.totalAppointments ?? 0),
        completedAppointments: Number(row.completedAppointments ?? 0),
        missedOrCancelledAppointments: Number(
          row.missedOrCancelledAppointments ?? 0,
        ),
      });
    }

    for (const row of paymentRows) {
      paymentMap.set(row.period, Number(row.completedRevenue ?? 0));
    }

    return periods.map((period) => {
      const periodKey =
        periodType === 'month'
          ? this.getMonthKey(period)
          : toDateString(period);
      const appointmentStats = appointmentMap.get(periodKey) ?? {
        totalAppointments: 0,
        completedAppointments: 0,
        missedOrCancelledAppointments: 0,
      };

      return {
        period: periodKey,
        totalAppointments: appointmentStats.totalAppointments,
        completedAppointments: appointmentStats.completedAppointments,
        missedOrCancelledAppointments:
          appointmentStats.missedOrCancelledAppointments,
        completedRevenue: paymentMap.get(periodKey) ?? 0,
      };
    });
  }

  private async buildStatusBreakdown(
    rows: Array<{ status: string; count: string | number }>,
  ): Promise<AppointmentStatusBreakdownItem[]> {
    const statusOrder: AppointmentStatusBreakdownItem['status'][] = [
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ];

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.status, Number(row.count ?? 0));
    }

    return statusOrder.map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    }));
  }

  private async getEmptyStatusBreakdown(): Promise<
    AppointmentStatusBreakdownItem[]
  > {
    return [
      { status: 'confirmed', count: 0 },
      { status: 'in_progress', count: 0 },
      { status: 'completed', count: 0 },
      { status: 'cancelled', count: 0 },
      { status: 'no_show', count: 0 },
    ];
  }

  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}