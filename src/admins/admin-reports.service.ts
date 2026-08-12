import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminReportDetails } from './interfaces/admin-report.interface';

// تأكد من صحة المسارات حسب مشروعك
import { RatingReport } from '../ratings/entities/rating-report.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(
    @InjectRepository(RatingReport)
    private readonly ratingReportRepository: Repository<RatingReport>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  /**
   * Returns full rating report details.
   */
  public async getReportDetails(reportId: number): Promise<AdminReportDetails> {
    try {
      const report = await this.ratingReportRepository
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporterPatient', 'reporterPatient')
        .leftJoinAndSelect('reporterPatient.user', 'reporterUser')
        .leftJoinAndSelect('report.rating', 'rating')
        .leftJoinAndSelect('rating.doctorProfile', 'doctorProfile')
        .leftJoinAndSelect('doctorProfile.user', 'doctorUser')
        .leftJoinAndSelect('rating.patientProfile', 'patientProfile')
        .leftJoinAndSelect('patientProfile.user', 'patientUser')
        .where('report.id = :reportId', { reportId })
        .getOne();

      if (!report) {
        throw new NotFoundException(`Report #${reportId} not found`);
      }

      // ✅ إعادة هيكلة البيانات بدون استخدام Record<string, unknown>
      return {
        report: report as any,
        reporterPatient: report.reporterPatient as any,
        rating: report.rating as any,
      };
    } catch (error) {
      this.logger.error('Failed to load report details', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}