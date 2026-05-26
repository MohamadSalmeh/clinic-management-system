import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Raw, Repository } from 'typeorm';
import { DoctorLeave } from './entities/doctor-leaves.entity';
import { CreateDoctorLeaveDto, DoctorLeaveQueryDto } from './dto';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';

const LEAVE_CANCELLATION_REASON = 'إلغاء تلقائي بسبب إجازة طارئة للطبيب';

@Injectable()
export class DoctorLeavesService {
  constructor(
    @InjectRepository(DoctorLeave)
    private readonly doctorLeaveRepository: Repository<DoctorLeave>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createLeave(
    userId: number,
    dto: CreateDoctorLeaveDto,
    isAdmin: boolean,
  ): Promise<DoctorLeave> {
    const doctorProfileId = await this.resolveDoctorProfileId(userId, dto, isAdmin);
    this.validateLeaveTimes(dto.startTime, dto.endTime);

    const exceptionDate = new Date(dto.exceptionDate);

    return this.dataSource.transaction(async (manager) => {
      const leaveRepository = manager.getRepository(DoctorLeave);
      const appointmentRepository = manager.getRepository(Appointment);

      const existingLeaves = await leaveRepository.find({
        where: {
          doctorProfileId,
          exceptionDate: Raw((alias) => `DATE(${alias}) = :date`, {
            date: dto.exceptionDate,
          }),
        },
      });

      if (this.hasOverlap(existingLeaves, dto.startTime ?? null, dto.endTime ?? null)) {
        throw new BadRequestException('Leave already exists for this time range');
      }

      const leave = leaveRepository.create({
        doctorProfileId,
        exceptionDate,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        reason: dto.reason ?? null,
      });

      const appointments = await appointmentRepository.find({
        where: {
          doctorId: doctorProfileId,
          status: 'confirmed',
          requestedDate: exceptionDate,
        },
        relations: { patient: true },
      });

      const impactedAppointments = appointments.filter((appointment) =>
        this.isAppointmentImpacted(
          appointment.startTime,
          appointment.endTime,
          dto.startTime ?? null,
          dto.endTime ?? null,
        ),
      );

      for (const appointment of impactedAppointments) {
        appointment.status = 'cancelled';
        appointment.cancellationReason = LEAVE_CANCELLATION_REASON;
        appointment.cancelledAt = new Date();
        await appointmentRepository.save(appointment);

        if (appointment.patient?.userId) {
          await this.notificationsService.notifyPatientAboutLeaveCancellation(
            appointment.patient.userId,
            appointment.id,
            dto.exceptionDate,
          );
        }
      }

      return leaveRepository.save(leave);
    });
  }

  async getLeavesForCurrentDoctor(userId: number): Promise<DoctorLeave[]> {
    const profile = await this.doctorProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.doctorLeaveRepository.find({
      where: { doctorProfileId: profile.id },
      order: { exceptionDate: 'DESC', startTime: 'ASC' },
    });
  }

  async getLeavesForAdmin(query: DoctorLeaveQueryDto): Promise<DoctorLeave[]> {
    const qb = this.doctorLeaveRepository.createQueryBuilder('leave');

    if (query.doctorProfileId) {
      qb.andWhere('leave.doctorProfileId = :doctorProfileId', {
        doctorProfileId: query.doctorProfileId,
      });
    }

    if (query.fromDate) {
      qb.andWhere('leave.exceptionDate >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      qb.andWhere('leave.exceptionDate <= :toDate', { toDate: query.toDate });
    }

    return qb.orderBy('leave.exceptionDate', 'DESC').getMany();
  }

  async deleteLeave(id: number, userId: number, isAdmin: boolean): Promise<void> {
    const leave = await this.doctorLeaveRepository.findOne({ where: { id } });

    if (!leave) {
      throw new NotFoundException('Leave not found');
    }

    if (!isAdmin) {
      const profile = await this.doctorProfileRepository.findOne({
        where: { userId },
      });

      if (!profile || Number(profile.id) !== Number(leave.doctorProfileId)) {
        throw new NotFoundException('Leave not found');
      }
    }

    await this.doctorLeaveRepository.remove(leave);
  }

  private async resolveDoctorProfileId(
    userId: number,
    dto: CreateDoctorLeaveDto,
    isAdmin: boolean,
  ): Promise<number> {
    if (isAdmin) {
      if (!dto.doctorProfileId) {
        throw new BadRequestException('doctorProfileId is required for admin leave creation');
      }

      return dto.doctorProfileId;
    }

    const profile = await this.doctorProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return profile.id;
  }

  private validateLeaveTimes(startTime?: string, endTime?: string): void {
    if ((startTime && !endTime) || (!startTime && endTime)) {
      throw new BadRequestException('Both startTime and endTime are required for partial leave');
    }

    if (startTime && endTime && startTime >= endTime) {
      throw new BadRequestException('Invalid leave time range');
    }
  }

  private hasOverlap(
    existingLeaves: DoctorLeave[],
    startTime: string | null,
    endTime: string | null,
  ): boolean {
    if (existingLeaves.length === 0) {
      return false;
    }

    if (!startTime || !endTime) {
      return true;
    }

    return existingLeaves.some((leave) => {
      if (!leave.startTime || !leave.endTime) {
        return true;
      }

      return this.isOverlap(startTime, endTime, leave.startTime, leave.endTime);
    });
  }

  private isAppointmentImpacted(
    appointmentStart: string,
    appointmentEnd: string,
    leaveStart: string | null,
    leaveEnd: string | null,
  ): boolean {
    if (!leaveStart || !leaveEnd) {
      return true;
    }

    return this.isOverlap(leaveStart, leaveEnd, appointmentStart, appointmentEnd);
  }

  private isOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && endA > startB;
  }
}
