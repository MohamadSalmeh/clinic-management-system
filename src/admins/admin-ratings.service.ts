import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminRatingDetails } from './interfaces/admin-rating.interface';

// تأكد من صحة المسارات حسب مشروعك
import { Rating } from '../ratings/entities/rating.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

@Injectable()
export class AdminRatingsService {
  private readonly logger = new Logger(AdminRatingsService.name);

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  /**
   * Returns full rating details.
   */
  public async getRatingDetails(ratingId: number): Promise<AdminRatingDetails> {
    try {
      const rating = await this.ratingRepository
        .createQueryBuilder('rating')
        .leftJoinAndSelect('rating.patientProfile', 'patientProfile')
        .leftJoinAndSelect('patientProfile.user', 'patientUser')
        .leftJoinAndSelect('rating.doctorProfile', 'doctorProfile')
        .leftJoinAndSelect('doctorProfile.user', 'doctorUser')
        .leftJoinAndSelect('rating.appointment', 'appointment')
        .leftJoinAndSelect('appointment.clinic', 'clinic')
        .where('rating.id = :ratingId', { ratingId })
        .getOne();

      if (!rating) {
        throw new NotFoundException(`Rating #${ratingId} not found`);
      }

      // ✅ إعادة هيكلة البيانات بدون استخدام Record<string, unknown>
      return {
        rating: rating as any,
        patientProfile: rating.patientProfile as any,
        doctorProfile: rating.doctorProfile as any,
        appointment: rating.appointment as any,
      };
    } catch (error) {
      this.logger.error('Failed to load rating details', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}