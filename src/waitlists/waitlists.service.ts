import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Waitlist, WaitlistStatus } from "./entities/waitlist.entity";
import { PatientProfile } from "../patients/entities/patient-profile.entity";
import { DoctorProfile } from "../doctors/entities/doctor-profile.entity";
import { DoctorSchedule, DoctorScheduleType } from "../doctor-schedules/entities/doctor-schedule.entity";
import { Appointment } from "../appointments/entities/appointment.entity";
import { DoctorLeave } from "../doctor-leaves/entities/doctor-leaves.entity";
import { Raw, Repository } from "typeorm";
import { SystemSettingsService } from "../system-setting/system-settings.service";
import { CreateWaitlistDto } from "./dto/create-waitlist.dto";
import { addMinutesToTime, getDayOfWeek, nowDate, toDateOnly } from "../common/utils/date-utils";
import {
    BadRequestException,
} from "@nestjs/common";
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationPriority } from '../notifications/enums/notification-priority.enum';
import { NotificationStatus } from '../notifications/enums/notification-status.enum';
import { NotificationTargetType } from '../notifications/enums/notification-target-type.enum';
import { NotificationType } from '../notifications/enums/notification-type.enum';
@Injectable()
export class WaitlistService {
    constructor(
        @InjectRepository(Waitlist)
        private readonly waitlistRepository: Repository<Waitlist>,

        @InjectRepository(PatientProfile)
        private readonly patientRepository: Repository<PatientProfile>,

        @InjectRepository(DoctorProfile)
        private readonly doctorRepository: Repository<DoctorProfile>,

        @InjectRepository(DoctorSchedule)
        private readonly doctorScheduleRepository: Repository<DoctorSchedule>,

        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,

        @InjectRepository(DoctorLeave)
        private readonly doctorLeaveRepository: Repository<DoctorLeave>,

        private readonly systemSettingsService: SystemSettingsService,

        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
    ) { }

    async joinWaitlist(
        userId: number,
        dto: CreateWaitlistDto,
    ): Promise<Waitlist> {

        const patient = await this.patientRepository.findOne({
            where: {
                userId,
            },
        });

        if (!patient) {
            throw new NotFoundException(
                'Patient profile not found',
            );
        }

        const doctor = await this.doctorRepository.findOne({
            where: {
                id: dto.doctorId,
            },
        });

        if (!doctor) {
            throw new NotFoundException(
                'Doctor not found',
            );
        }

        const dayOfWeek = getDayOfWeek(dto.requestedDate);

        const schedules = await this.doctorScheduleRepository.find({
            where: {
                doctorProfileId: dto.doctorId,
                clinicId: dto.clinicId,
                dayOfWeek,
                isActive: true,
                type: DoctorScheduleType.NORMAL,
            },
        });

        if (schedules.length === 0) {
            throw new BadRequestException(
                'Doctor does not work on this day',
            );
        }

        const settings =
            await this.systemSettingsService.getSettings();

        const minimumDuration = Math.min(
            settings.initialVisitDuration,
            settings.returnVisitDuration,
        );

        const fullyBooked =
            await this.isDayFullyBooked(
                dto.doctorId,
                dto.clinicId,
                dto.requestedDate,
                minimumDuration,
            );

        if (!fullyBooked) {
            throw new BadRequestException(
                'Appointments are still available for this day',
            );
        }

        const existing = await this.waitlistRepository.findOne({
            where: {
                patientProfileId: patient.id,
                doctorProfileId: dto.doctorId,
                clinicId: dto.clinicId,
                requestedDate: toDateOnly(dto.requestedDate),
            },
        });

        if (existing) {
            throw new BadRequestException(
                'Already in waitlist',
            );
        }

        const waitlist = this.waitlistRepository.create({
            patientProfileId: patient.id,
            doctorProfileId: dto.doctorId,
            clinicId: dto.clinicId,
            requestedDate: toDateOnly(dto.requestedDate),
        });

        return await this.waitlistRepository.save(waitlist);
    }
    async isDayFullyBooked(
        doctorId: number,
        clinicId: number,
        requestedDate: string,
        duration: number,
    ): Promise<boolean> {
        const dayOfWeek = getDayOfWeek(requestedDate);

        const schedules = await this.doctorScheduleRepository.find({
            where: {
                doctorProfileId: doctorId,
                clinicId,
                dayOfWeek,
                isActive: true,
            },
            order: {
                startTime: 'ASC',
            },
        });

        const workingSchedules = schedules.filter(
            (schedule) => schedule.type !== DoctorScheduleType.BREAK,
        );

        // لا يجب أن نصل لهذه الحالة إذا كان joinWaitlist يتحقق من وجود Schedule
        if (workingSchedules.length === 0) {
            return false;
        }

        const breakSchedules = schedules.filter(
            (schedule) => schedule.type === DoctorScheduleType.BREAK,
        );

        const leaves = await this.doctorLeaveRepository.find({
            where: {
                doctorProfileId: doctorId,
                exceptionDate: Raw((alias) => `DATE(${alias}) = :date`, {
                    date: requestedDate,
                }),
            },
        });

        // إجازة طوال اليوم => اليوم غير متاح إطلاقاً
        if (leaves.some((leave) => !leave.startTime && !leave.endTime)) {
            return true;
        }

        const appointments = await this.appointmentRepository
            .createQueryBuilder('appointment')
            .where('appointment.doctorId = :doctorId', {
                doctorId,
            })
            .andWhere('DATE(appointment.requestedDate)=:date', {
                date: requestedDate,
            })
            .andWhere('appointment.status IN (:...status)', {
                status: ['pending', 'confirmed'],
            })
            .orderBy('appointment.startTime', 'ASC')
            .getMany();

        type BlockedInterval = {
            start: string;
            end: string;
        };

        for (const schedule of workingSchedules) {
            const blockedIntervals: BlockedInterval[] = [];

            // Appointments
            for (const appointment of appointments) {
                if (
                    appointment.startTime >= schedule.startTime &&
                    appointment.endTime <= schedule.endTime
                ) {
                    blockedIntervals.push({
                        start: appointment.startTime,
                        end: appointment.endTime,
                    });
                }
            }

            // Breaks
            for (const breakSchedule of breakSchedules) {
                if (
                    this.isOverlap(
                        breakSchedule.startTime,
                        breakSchedule.endTime,
                        schedule.startTime,
                        schedule.endTime,
                    )
                ) {
                    blockedIntervals.push({
                        start: breakSchedule.startTime,
                        end: breakSchedule.endTime,
                    });
                }
            }

            // Partial Leaves
            for (const leave of leaves) {
                if (
                    leave.startTime &&
                    leave.endTime &&
                    this.isOverlap(
                        leave.startTime,
                        leave.endTime,
                        schedule.startTime,
                        schedule.endTime,
                    )
                ) {
                    blockedIntervals.push({
                        start: leave.startTime,
                        end: leave.endTime,
                    });
                }
            }

            blockedIntervals.sort((a, b) =>
                a.start.localeCompare(b.start),
            );

            let start = schedule.startTime;

            for (const interval of blockedIntervals) {
                const candidateEnd = addMinutesToTime(start, duration);

                // وجدنا فراغاً يكفي لحجز أقل موعد
                if (candidateEnd <= interval.start) {
                    return false;
                }

                if (
                    this.isOverlap(
                        start,
                        candidateEnd,
                        interval.start,
                        interval.end,
                    )
                ) {
                    start = interval.end;
                }
            }

            const end = addMinutesToTime(start, duration);

            if (end <= schedule.endTime) {
                return false;
            }
        }

        // لا يوجد أي Schedule يمكنه استقبال حتى أقصر موعد
        return true;
    }
    private isOverlap(
        startA: string,
        endA: string,
        startB: string,
        endB: string,
    ): boolean {
        return startA < endB && endA > startB;
    }
    async notifyWaitlist(
        doctorId: number,
        clinicId: number,
        requestedDate: string,
        startTime: string,
        endTime: string,
    ): Promise<void> {

        const waitlists = await this.waitlistRepository.find({
            where: {
                doctorProfileId: doctorId,
                clinicId,
                requestedDate: toDateOnly(requestedDate),
            },
            relations: {
                patient: {
                    user: true,
                },
            },
        });

        for (const waitlist of waitlists) {

            await this.notificationRepository.save(
                this.notificationRepository.create({
                    userId: waitlist.patient.userId,

                    title: '',
                    body: '',

                    messageKey: 'waitlist.slot.available',

                    arguments: {
                        doctorId,
                        clinicId,
                        requestedDate,
                        startTime,
                        endTime,
                    },

                    type: NotificationType.APPOINTMENT,

                    priority: NotificationPriority.HIGH,

                    status: NotificationStatus.PENDING,

                    targetType: NotificationTargetType.APPOINTMENT,

                    targetId: null,
                }),
            );

            /* waitlist.status = WaitlistStatus.NOTIFIED;
             waitlist.notificationSentAt = nowDate();

            await this.waitlistRepository.save(waitlist);*/
        }
    }
    async leaveWaitlist(
        userId: number,
        dto: CreateWaitlistDto,
    ): Promise<{ message: string }> {

        const patient = await this.patientRepository.findOne({
            where: {
                userId,
            },
        });

        if (!patient) {
            throw new NotFoundException(
                'Patient profile not found',
            );
        }

        const waitlist = await this.waitlistRepository.findOne({
            where: {
                patientProfileId: patient.id,
                doctorProfileId: dto.doctorId,
                clinicId: dto.clinicId,
                requestedDate: toDateOnly(dto.requestedDate),
            },
        });

        if (!waitlist) {
            throw new NotFoundException(
                'You are not in the waitlist',
            );
        }

        await this.waitlistRepository.remove(waitlist);

        return {
            message: 'Left waitlist successfully',
        };
    }
}
