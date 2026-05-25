import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MedicalProfileLog } from './entities/medical-profile-log.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { MedicalProfileLogQueryDto } from './dto';
import { UserRole } from '../users/enums/user-role.enum';

export type MedicalProfileLogResponse = {
    id: number;
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
    changeReason: string | null;
    appointmentId: number | null;
    createdAt: Date;
    changedBy: {
        id: number;
        role: UserRole;
        fullName: string;
    };
};

@Injectable()
export class MedicalProfileLogsService {
    constructor(
        @InjectRepository(MedicalProfileLog)
        private readonly medicalProfileLogRepository: Repository<MedicalProfileLog>,
        @InjectRepository(PatientProfile)
        private readonly patientProfileRepository: Repository<PatientProfile>,
        @InjectRepository(MedicalProfile)
        private readonly medicalProfileRepository: Repository<MedicalProfile>,
    ) { }

    async getLogsForCurrentPatient(
        userId: number,
        query: MedicalProfileLogQueryDto,
    ): Promise<MedicalProfileLogResponse[]> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: { userId },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        return this.getLogsForPatientProfile(patientProfile.id, query);
    }

    async getLogsForPatient(
        patientId: number,
        query: MedicalProfileLogQueryDto,
    ): Promise<MedicalProfileLogResponse[]> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: { id: patientId },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        return this.getLogsForPatientProfile(patientProfile.id, query);
    }

    private async getLogsForPatientProfile(
        patientProfileId: number,
        query: MedicalProfileLogQueryDto,
    ): Promise<MedicalProfileLogResponse[]> {
        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: { patientProfileId },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        const logs = await this.buildLogsQuery(medicalProfile.id, query).getMany();

        return logs.map((log) => this.mapLog(log));
    }

    private buildLogsQuery(
        medicalProfileId: number,
        query: MedicalProfileLogQueryDto,
    ): SelectQueryBuilder<MedicalProfileLog> {
        const qb = this.medicalProfileLogRepository
            .createQueryBuilder('log')
            .leftJoin('log.user', 'user')
            .where('log.medicalProfileId = :medicalProfileId', { medicalProfileId });

        if (query.field) {
            qb.andWhere('log.fieldName = :field', { field: query.field });
        }

        if (query.changedBy) {
            qb.andWhere('user.role = :role', { role: query.changedBy });
        }

        if (query.from) {
            qb.andWhere('log.created_at >= :from', { from: new Date(query.from) });
        }

        if (query.to) {
            qb.andWhere('log.created_at <= :to', { to: new Date(query.to) });
        }
        if (query.to) {
            const endDate = new Date(query.to);
            endDate.setHours(23, 59, 59, 999);

            qb.andWhere('log.created_at <= :to', {
                to: endDate,
            });
        }

        return qb
            .select([
                'log.id',
                'log.fieldName',
                'log.oldValue',
                'log.newValue',
                'log.changeReason',
                'log.appointmentId',
                'log.created_at',
                'user.id',
                'user.role',
                'user.firstName',
                'user.fatherName',
                'user.lastName',
            ])
            .orderBy('log.created_at', 'DESC');
    }

    private mapLog(log: MedicalProfileLog): MedicalProfileLogResponse {
        return {
            id: log.id,
            fieldName: log.fieldName,
            oldValue: log.oldValue ?? null,
            newValue: log.newValue ?? null,
            changeReason: log.changeReason ?? null,
            appointmentId: log.appointmentId ?? null,
            createdAt: log.created_at,
            changedBy: {
                id: log.user.id,
                role: log.user.role,
                fullName: log.user.fullName,
            },
        };
    }
}
