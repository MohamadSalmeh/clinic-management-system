import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalProfile } from './entities/medical-profile.entity';
import { CreateMedicalProfileDto, UpdateMedicalProfileDto } from './dto';
import { MedicalProfileLog } from '../medical-profile-logs/entities/medical-profile-log.entity';
import { Gender } from '../users/enums/gender.enum';

export type MedicalProfileResponse = MedicalProfile;

export type MedicalProfileCompletionStatus = {
    completed: boolean;
    completionPercentage: number;
    missingFields: string[];
};

@Injectable()
export class MedicalProfilesService {
    constructor(
        @InjectRepository(PatientProfile)
        private readonly patientProfileRepository: Repository<PatientProfile>,
        @InjectRepository(MedicalProfile)
        private readonly medicalProfileRepository: Repository<MedicalProfile>,
        @InjectRepository(MedicalProfileLog)
        private readonly medicalProfileLogRepository: Repository<MedicalProfileLog>,
    ) { }

    async createProfile(
        userId: number,
        dto: CreateMedicalProfileDto,
    ): Promise<MedicalProfile> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: { userId },
            relations: {
                user: true,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const existingProfile = await this.medicalProfileRepository.findOne({
            where: { patientProfileId: patientProfile.id },
        });

        if (existingProfile) {
            throw new BadRequestException('Medical profile already exists');
        }

        if (
            patientProfile.user?.gender === Gender.MALE
            && dto.pregnancyStatus !== undefined
            && dto.pregnancyStatus !== null
        ) {
            throw new BadRequestException(
                'Pregnancy status can only be provided for female patients',
            );
        }

        const medicalProfile = this.medicalProfileRepository.create({
            patientProfileId: patientProfile.id,
            bloodType: dto.bloodType ?? null,
            pregnancyStatus: dto.pregnancyStatus ?? null,
            disabilityInfo: dto.disabilityInfo ?? null,
            currentSymptoms: dto.currentSymptoms ?? null,
            allergies: dto.allergies ?? null,
            chronicConditions: dto.chronicConditions ?? null,
            pastSurgeries: dto.pastSurgeries ?? null,
            familyHistory: dto.familyHistory ?? null,
            currentMedications: dto.currentMedications ?? null,
            lifestyleHabits: dto.lifestyleHabits ?? null,
            vaccinationStatus: dto.vaccinationStatus ?? null,
        });

        return this.medicalProfileRepository.save(medicalProfile);
    }

    async getCurrentProfile(userId: number): Promise<MedicalProfileResponse> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: { userId },
            relations: {
                user: true,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: { patientProfileId: patientProfile.id },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        return medicalProfile;
    }

    async updateCurrentProfile(
        userId: number,
        dto: UpdateMedicalProfileDto,
    ): Promise<MedicalProfileResponse> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: { userId },
            relations: {
                user: true,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: { patientProfileId: patientProfile.id },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        const changes = this.collectChanges(medicalProfile, dto);

        if (dto.bloodType !== undefined) {
            medicalProfile.bloodType = dto.bloodType ?? null;
        }

        if (
            patientProfile.user?.gender === Gender.MALE
            && dto.pregnancyStatus !== undefined
            && dto.pregnancyStatus !== null
        ) {
            throw new BadRequestException(
                'Pregnancy status can only be provided for female patients',
            );
        }

        if (dto.pregnancyStatus !== undefined) {
            medicalProfile.pregnancyStatus = dto.pregnancyStatus;
        }

        if (dto.disabilityInfo !== undefined) {
            medicalProfile.disabilityInfo = dto.disabilityInfo ?? null;
        }

        if (dto.currentSymptoms !== undefined) {
            medicalProfile.currentSymptoms = dto.currentSymptoms ?? null;
        }

        if (dto.allergies !== undefined) {
            medicalProfile.allergies = dto.allergies ?? null;
        }

        if (dto.chronicConditions !== undefined) {
            medicalProfile.chronicConditions = dto.chronicConditions ?? null;
        }

        if (dto.pastSurgeries !== undefined) {
            medicalProfile.pastSurgeries = dto.pastSurgeries ?? null;
        }

        if (dto.familyHistory !== undefined) {
            medicalProfile.familyHistory = dto.familyHistory ?? null;
        }

        if (dto.currentMedications !== undefined) {
            medicalProfile.currentMedications = dto.currentMedications ?? null;
        }

        if (dto.lifestyleHabits !== undefined) {
            medicalProfile.lifestyleHabits = dto.lifestyleHabits ?? null;
        }

        if (dto.vaccinationStatus !== undefined) {
            medicalProfile.vaccinationStatus = dto.vaccinationStatus ?? null;
        }

        const savedProfile = await this.medicalProfileRepository.save(medicalProfile);

        await this.saveLogs(savedProfile.id, userId, changes);

        return savedProfile;
    }

    async getCompletionStatus(userId: number): Promise<MedicalProfileCompletionStatus> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: { userId },
            relations: {
                user: true,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: { patientProfileId: patientProfile.id },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        const requiredFields: Array<keyof MedicalProfile> = [
            'bloodType',
            'disabilityInfo',
            'currentSymptoms',
            'allergies',
            'chronicConditions',
            'pastSurgeries',
            'familyHistory',
            'currentMedications',
            'lifestyleHabits',
            'vaccinationStatus',
        ];

        if (patientProfile.user?.gender === Gender.FEMALE) {
            requiredFields.push('pregnancyStatus');
        }

        const missingFields = requiredFields.filter((field) => medicalProfile[field] == null);
        const completionPercentage = requiredFields.length === 0
            ? 100
            : Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100);

        return {
            completed: missingFields.length === 0,
            completionPercentage,
            missingFields: missingFields.map((field) => field.toString()),
        };
    }

    private collectChanges(
        medicalProfile: MedicalProfile,
        dto: UpdateMedicalProfileDto,
    ): Array<{ fieldName: string; oldValue: unknown; newValue: unknown }> {
        const fields: Array<keyof UpdateMedicalProfileDto> = [
            'bloodType',
            'pregnancyStatus',
            'disabilityInfo',
            'currentSymptoms',
            'allergies',
            'chronicConditions',
            'pastSurgeries',
            'familyHistory',
            'currentMedications',
            'lifestyleHabits',
            'vaccinationStatus',
        ];

        const changes: Array<{ fieldName: string; oldValue: unknown; newValue: unknown }> = [];
        const profileRecord = medicalProfile as unknown as Record<string, unknown>;

        for (const field of fields) {
            if (dto[field] === undefined) {
                continue;
            }

            const oldValue = profileRecord[field as string];
            const newValue = dto[field] as unknown;

            if (this.valuesEqual(oldValue, newValue)) {
                continue;
            }

            changes.push({
                fieldName: field as string,
                oldValue,
                newValue,
            });
        }

        return changes;
    }

    private valuesEqual(oldValue: unknown, newValue: unknown): boolean {
        return JSON.stringify(oldValue ?? null) === JSON.stringify(newValue ?? null);
    }

    private async saveLogs(
        medicalProfileId: number,
        userId: number,
        changes: Array<{ fieldName: string; oldValue: unknown; newValue: unknown }>,
    ): Promise<void> {
        if (changes.length === 0) {
            return;
        }

        const logs = changes.map((change) =>
            this.medicalProfileLogRepository.create({
                medicalProfileId,
                userId,
                fieldName: change.fieldName,
                oldValue: change.oldValue ?? null,
                newValue: change.newValue ?? null,
                changeReason: null,
                appointmentId: null,
            }),
        );

        await this.medicalProfileLogRepository.save(logs);
    }
}
