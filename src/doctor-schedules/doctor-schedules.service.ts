import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { CreateDoctorScheduleDto, DoctorScheduleSlotDto } from './dto';
import { DoctorSchedule } from './entities/doctor-schedule.entity';
import {
  DoctorScheduleRequest,
  DoctorScheduleRequestStatus,
} from './entities/doctor-schedule-request.entity';
import { DoctorAdminLogsService } from '../doctors/doctor-admin-logs.service';
import { DoctorAdminLogType } from '../doctors/entities/doctor-admin-log.entity';

@Injectable()
export class DoctorSchedulesService {
  private readonly logger = new Logger(DoctorSchedulesService.name);

  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly doctorScheduleRepository: Repository<DoctorSchedule>,
    @InjectRepository(DoctorScheduleRequest)
    private readonly doctorScheduleRequestRepository: Repository<DoctorScheduleRequest>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly dataSource: DataSource,
    private readonly doctorAdminLogsService: DoctorAdminLogsService,
  ) {}

  async createOrUpdateWeeklyTemplate(
    userId: number,
    dto: CreateDoctorScheduleDto,
  ): Promise<DoctorSchedule[] | { message: string }> {
    const doctorProfile = await this.doctorProfileRepository.findOne({
      where: { userId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const slots = dto.slots ?? [];

    this.validateSlots(slots);

    const existingSchedules = await this.doctorScheduleRepository.find({
      where: {
        doctorProfileId: doctorProfile.id,
        dayOfWeek: dto.dayOfWeek,
      },
    });

    await this.ensureNoAppointmentConflicts(
      doctorProfile.id,
      dto.dayOfWeek,
      dto.isActive,
      slots,
    );

    await this.ensureNoCrossClinicConflicts(
      doctorProfile.id,
      dto.dayOfWeek,
      dto.clinicId,
      slots,
    );

    if (existingSchedules.length === 0) {
      if (!dto.isActive) {
        return { message: 'Schedule day marked inactive.' };
      }

      if (slots.length === 0) {
        throw new BadRequestException('Slots are required for schedule setup.');
      }

      return this.dataSource.transaction(async (manager) => {
        const scheduleRepository = manager.getRepository(DoctorSchedule);
        const schedules = slots.map((slot) =>
          scheduleRepository.create({
            doctorProfileId: doctorProfile.id,
            clinicId: dto.clinicId,
            dayOfWeek: dto.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.type,
            notes: slot.notes ?? null,
            isActive: dto.isActive,
          }),
        );

        return scheduleRepository.save(schedules);
      });
    }

    if (slots.length === 0) {
      throw new BadRequestException('Slots are required for schedule changes.');
    }

    await this.dataSource.transaction(async (manager) => {
      const requestRepository = manager.getRepository(DoctorScheduleRequest);
      const requests = slots.map((slot) =>
        requestRepository.create({
          doctorProfileId: doctorProfile.id,
          clinicId: dto.clinicId,
          dayOfWeek: dto.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          notes: slot.notes ?? null,
        }),
      );

      await requestRepository.save(requests);
    });

    return { message: 'Schedule change request submitted for Admin approval.' };
  }

  async updateRequestStatus(
    requestId: number,
    status: DoctorScheduleRequestStatus,
    adminNotes?: string,
    adminUserId?: number,
  ): Promise<{ message: string }> {
    const request = await this.doctorScheduleRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Schedule request not found');
    }

    if (request.status !== DoctorScheduleRequestStatus.PENDING) {
      throw new BadRequestException('Only pending schedule requests can be updated');
    }

    if (status === DoctorScheduleRequestStatus.REJECTED) {
      request.status = DoctorScheduleRequestStatus.REJECTED;
      request.adminNotes = adminNotes ?? null;
      await this.doctorScheduleRequestRepository.save(request);

      return { message: 'Schedule request rejected.' };
    }

    let oldSchedulesSnapshot: DoctorSchedule[] = [];
    let newSchedulesSnapshot: DoctorScheduleRequest[] = [];

    await this.dataSource.transaction(async (manager) => {
      const requestRepository = manager.getRepository(DoctorScheduleRequest);
      const scheduleRepository = manager.getRepository(DoctorSchedule);

      oldSchedulesSnapshot = await scheduleRepository.find({
        where: {
          doctorProfileId: request.doctorProfileId,
          clinicId: request.clinicId,
          dayOfWeek: request.dayOfWeek,
        },
      });

      const pendingRequests = await requestRepository.find({
        where: {
          doctorProfileId: request.doctorProfileId,
          clinicId: request.clinicId,
          dayOfWeek: request.dayOfWeek,
          status: DoctorScheduleRequestStatus.PENDING,
        },
      });

      if (pendingRequests.length === 0) {
        throw new BadRequestException('No pending schedule requests found to approve');
      }

      newSchedulesSnapshot = pendingRequests;

      await scheduleRepository.delete({
        doctorProfileId: request.doctorProfileId,
        clinicId: request.clinicId,
        dayOfWeek: request.dayOfWeek,
      });

      const schedules = pendingRequests.map((pendingRequest) =>
        scheduleRepository.create({
          doctorProfileId: pendingRequest.doctorProfileId,
          clinicId: pendingRequest.clinicId,
          dayOfWeek: pendingRequest.dayOfWeek,
          startTime: pendingRequest.startTime,
          endTime: pendingRequest.endTime,
          type: pendingRequest.type,
          notes: pendingRequest.notes ?? null,
          isActive: true,
        }),
      );

      await scheduleRepository.save(schedules);

      await requestRepository.update(
        {
          doctorProfileId: request.doctorProfileId,
          clinicId: request.clinicId,
          dayOfWeek: request.dayOfWeek,
          status: DoctorScheduleRequestStatus.PENDING,
        },
        {
          status: DoctorScheduleRequestStatus.APPROVED,
          adminNotes: adminNotes ?? null,
        },
      );
    });

    if (adminUserId !== undefined) {
      await this.doctorAdminLogsService.createLog(
        request.doctorProfileId,
        DoctorAdminLogType.SCHEDULE_APPROVE,
        'schedule',
        oldSchedulesSnapshot.length > 0 ? JSON.stringify(oldSchedulesSnapshot) : null,
        JSON.stringify(newSchedulesSnapshot),
        adminUserId,
        request.notes ?? null,
      );
    }

    return { message: 'Schedule request approved and applied.' };
  }

  async getDoctorOwnSchedule(userId: number): Promise<DoctorSchedule[]> {
    const doctorProfile = await this.doctorProfileRepository.findOne({
      where: { userId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.doctorScheduleRepository.find({
      where: { doctorProfileId: doctorProfile.id },
      relations: { clinic: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async getDoctorScheduleForAdmin(
    doctorProfileId: number,
  ): Promise<DoctorSchedule[]> {
    return this.doctorScheduleRepository.find({
      where: { doctorProfileId },
      relations: { clinic: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async getPendingScheduleRequestsForAdmin(): Promise<DoctorScheduleRequest[]> {
    return this.doctorScheduleRequestRepository.find({
      where: { status: DoctorScheduleRequestStatus.PENDING },
      relations: { doctorProfile: { user: true }, clinic: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async getDoctorScheduleForPatient(
    doctorProfileId: number,
    clinicId: number,
  ): Promise<DoctorSchedule[]> {
    return this.doctorScheduleRepository.find({
      where: {
        doctorProfileId,
        clinicId,
        isActive: true,
      },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async getClinicSchedule(clinicId: number): Promise<DoctorSchedule[]> {
    return this.doctorScheduleRepository.find({
      where: {
        clinicId,
        isActive: true,
      },
      relations: { doctorProfile: { user: true } },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  private validateSlots(slots: DoctorScheduleSlotDto[]): void {
    for (const slot of slots) {
      if (!this.isTimeRangeValid(slot.startTime, slot.endTime)) {
        throw new BadRequestException('Invalid slot time range.');
      }
    }

    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        if (
          this.isOverlap(
            slots[i].startTime,
            slots[i].endTime,
            slots[j].startTime,
            slots[j].endTime,
          )
        ) {
          throw new BadRequestException('Schedule slots cannot overlap.');
        }
      }
    }
  }

 private async ensureNoAppointmentConflicts(
    doctorProfileId: number,
    dayOfWeek: number,
    isActive: boolean,
    slots: DoctorScheduleSlotDto[],
  ): Promise<void> {
    const appointments = await this.appointmentRepository.find({
      where: {
        doctorId: doctorProfileId,
        status: 'confirmed',
      },
    });

    const dayAppointments = appointments.filter((appointment) => {
      if (!appointment.requestedDate) {
        return false;
      }

      const appointmentDate = new Date(appointment.requestedDate);
      return appointmentDate.getDay() === dayOfWeek;
    });

    if (dayAppointments.length === 0) {
      return;
    }

    if (!isActive) {
      throw new BadRequestException(
        'Cannot modify schedule: You have active patient appointments booked during these hours.',
      );
    }

    const hasAppointmentOutsideSlots = dayAppointments.some((appointment) =>
      slots.every(
        (slot) =>
          !this.isOverlap(
            slot.startTime,
            slot.endTime,
            appointment.startTime,
            appointment.endTime,
          ),
      ),
    );

    if (hasAppointmentOutsideSlots) {
      throw new BadRequestException(
        'Cannot modify schedule: You have active patient appointments booked during these hours.',
      );
    }
  }

  private async ensureNoCrossClinicConflicts(
    doctorProfileId: number,
    dayOfWeek: number,
    clinicId: number,
    slots: DoctorScheduleSlotDto[],
  ): Promise<void> {
    if (slots.length === 0) {
      return;
    }

    const otherClinicSchedules = await this.doctorScheduleRepository.find({
      where: {
        doctorProfileId,
        dayOfWeek,
        clinicId: Not(clinicId),
        isActive: true,
      },
    });

    const hasConflict = otherClinicSchedules.some((schedule) =>
      slots.some((slot) =>
        this.isOverlap(
          slot.startTime,
          slot.endTime,
          schedule.startTime,
          schedule.endTime,
        ),
      ),
    );

    if (hasConflict) {
      throw new BadRequestException(
        'Cannot modify schedule: Conflicts with another clinic schedule.',
      );
    }
  }

  private isTimeRangeValid(startTime: string, endTime: string): boolean {
    return startTime < endTime;
  }

  private isOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    return startA < endB && endA > startB;
  }
}
