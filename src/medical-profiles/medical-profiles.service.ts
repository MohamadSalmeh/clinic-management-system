import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalProfile } from './entities/medical-profile.entity';
import { CreateMedicalProfileDto, UpdateMedicalProfileDto } from './dto';
import { MedicalProfileLog } from '../medical-profile-logs/entities/medical-profile-log.entity';
import { Gender } from '../users/enums/gender.enum';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { ActiveUserData } from '../utils';
import { AppointmentAccessService } from '../appointment-access/appointment-access.service';
const MEDICAL_RECORD_EDIT_WINDOW_DAYS = 7;


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
        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,
        @InjectRepository(DoctorProfile)
        private readonly doctorProfileRepository: Repository<DoctorProfile>,
        private readonly appointmentAccessService: AppointmentAccessService,
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

        /* const changes = this.collectChanges(medicalProfile, dto);
 
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
         */
        return this.applyProfileUpdate(
            medicalProfile,
            patientProfile,
            dto,
            userId,
        );
    }
    async updateByAppointment(
        appointmentId: number,
        currentUser: ActiveUserData,
        dto: UpdateMedicalProfileDto,
    ): Promise<MedicalProfileResponse> {

        /* const doctorProfile = await this.doctorProfileRepository.findOne({
             where: { userId: currentUser.sub },
         });
 
         if (!doctorProfile) {
             throw new NotFoundException('Doctor profile not found');
         }
 
         const appointment = await this.appointmentRepository.findOne({
             where: { id: appointmentId },
         });
 
         if (!appointment) {
             throw new NotFoundException('Appointment not found');
         }
 
         if (appointment.status === 'cancelled') {
             throw new BadRequestException('Cancelled appointments cannot be used');
         }
 
         if (appointment.doctorId !== doctorProfile.id) {
             throw new BadRequestException(
                 'You are not allowed to update this medical profile',
             );
         }
 
         const appointmentDate = new Date(appointment.requestedDate);
         const expiryDate = new Date(appointmentDate);
         expiryDate.setDate(
             expiryDate.getDate() + MEDICAL_RECORD_EDIT_WINDOW_DAYS,
         );
 
         if (new Date() > expiryDate) {
             throw new BadRequestException(
                 'Medical profile edit window has expired',
             );
         }*/
        const { appointment } =
            await this.appointmentAccessService.validateDoctorAppointmentAccess(
                appointmentId,
                currentUser.sub,
            );
        const patientProfile = await this.patientProfileRepository.findOne({
            where: { id: appointment.patientId },
            relations: {
                user: true,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: {
                patientProfileId: patientProfile.id,
            },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        return this.applyProfileUpdate(
            medicalProfile,
            patientProfile,
            dto,
            currentUser.sub,
            appointment.id,
            dto.changeReason ?? null,
        );
    }
    /* async uploadProfileAttachmentByAppointment(
         appointmentId: number,
         file: Express.Multer.File,
         currentUser: ActiveUserData,
     ): Promise<MedicalAttachment> {
 
     }*/

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
    private async applyProfileUpdate(
        medicalProfile: MedicalProfile,
        patientProfile: PatientProfile,
        dto: UpdateMedicalProfileDto,
        userId: number,
        appointmentId: number | null = null,
        changeReason: string | null = null,
    ): Promise<MedicalProfileResponse> {

        const changes = this.collectChanges(medicalProfile, dto);

        if (dto.bloodType !== undefined) {
            medicalProfile.bloodType = dto.bloodType ?? null;
        }

        if (
            patientProfile.user?.gender === Gender.MALE &&
            dto.pregnancyStatus !== undefined &&
            dto.pregnancyStatus !== null
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

        await this.saveLogs(
            savedProfile.id,
            userId,
            changes,
            appointmentId,
            changeReason,
        );

        return savedProfile;
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
        appointmentId: number | null = null,
        changeReason: string | null = null,
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
                changeReason: changeReason,
                appointmentId: appointmentId,
            }),
        );

        await this.medicalProfileLogRepository.save(logs);
    }
    async getByAppointment(
        appointmentId: number,
        currentUser: ActiveUserData,
    ): Promise<MedicalProfileResponse> {

        return this.appointmentAccessService.getMedicalProfileByAppointment(
            appointmentId,
            currentUser.sub,
        );
    }
}
