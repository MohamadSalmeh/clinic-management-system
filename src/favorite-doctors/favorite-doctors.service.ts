import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FavoriteDoctor } from './entities/favorite-doctor.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';

@Injectable()
export class FavoriteDoctorsService {
    constructor(
        @InjectRepository(FavoriteDoctor)
        private readonly favoriteDoctorRepository: Repository<FavoriteDoctor>,

        @InjectRepository(PatientProfile)
        private readonly patientProfileRepository: Repository<PatientProfile>,

        @InjectRepository(DoctorProfile)
        private readonly doctorProfileRepository: Repository<DoctorProfile>,
    ) { }

    async addDoctorToFavorites(
        userId: number,
        doctorId: number,
    ): Promise<{ message: string }> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: {
                userId,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const doctorProfile = await this.doctorProfileRepository.findOne({
            where: {
                id: doctorId,
            },
        });

        if (!doctorProfile) {
            throw new NotFoundException('Doctor profile not found');
        }

        const existingFavorite =
            await this.favoriteDoctorRepository.findOne({
                where: {
                    patient: {
                        id: patientProfile.id,
                    },
                    doctor: {
                        id: doctorProfile.id,
                    },
                },
            });

        if (existingFavorite) {
            throw new ConflictException(
                'This doctor is already in your favorites',
            );
        }

        const favoriteDoctor =
            this.favoriteDoctorRepository.create({
                patient: patientProfile,
                doctor: doctorProfile,
            });

        await this.favoriteDoctorRepository.save(
            favoriteDoctor,
        );

        return {
            message:
                'Doctor has been added to favorites successfully',
        };
    }

    async removeDoctorFromFavorites(
        userId: number,
        doctorId: number,
    ): Promise<{ message: string }> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: {
                userId,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const favoriteDoctor =
            await this.favoriteDoctorRepository.findOne({
                where: {
                    patient: {
                        id: patientProfile.id,
                    },
                    doctor: {
                        id: doctorId,
                    },
                },
            });

        if (!favoriteDoctor) {
            throw new NotFoundException(
                'This doctor is not in your favorites',
            );
        }

        await this.favoriteDoctorRepository.delete(favoriteDoctor.id);

        return {
            message:
                'Doctor has been removed from favorites successfully',
        };
    }
    async getMyFavoriteDoctors(
        userId: number,
    ): Promise<FavoriteDoctor[]> {
        const patientProfile = await this.patientProfileRepository.findOne({
            where: {
                userId,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        return this.favoriteDoctorRepository.find({
            where: {
                patient: {
                    id: patientProfile.id,
                },
            },
            relations: {
                doctor: {
                    user: true,
                },
            },
            order: {
                created_at: 'DESC',
            },
        });
    }

}
