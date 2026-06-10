import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { RatingReport } from './entities/rating-report.entity';
import { CreateRatingDto, ReportRatingDto, RatingQueryDto } from './dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { ReportStatus } from './enums/report-status.enum';
import { RatingStatus } from './enums/rating-status.enum';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity'; // تأكد من المسار الصحيح
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,

    @InjectRepository(RatingReport)
    private readonly reportRepository: Repository<RatingReport>,

    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,

    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
  ) {}

  private async syncAverages(doctorId: number): Promise<void> {
    const doctorAvg = await this.calculateDoctorAverageRating(doctorId);
    await this.ratingRepository.manager.update(DoctorProfile, doctorId, {
      averageRating: doctorAvg,
    });

    const doctorClinics = await this.ratingRepository.manager.find(
      DoctorClinic,
      {
        where: { doctorId },
      },
    );

    for (const dc of doctorClinics) {
      const clinicAvg = await this.calculateClinicAverageRating(dc.clinicId);
      await this.ratingRepository.manager.update(Clinic, dc.clinicId, {
        averageRating: clinicAvg,
      });
    }
  }
async createRating(userId: number, dto: CreateRatingDto): Promise<Rating> {
    const patient = await this.patientProfileRepository.findOne({
      where: { userId },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    // استعلام مباشر للموعد
    const appointment = await this.ratingRepository.manager.findOne('Appointment', {
      where: { id: dto.appointmentId },
    } as any) as any;

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    if (appointment.status !== 'completed') {
      throw new BadRequestException(
        'Cannot rate an appointment that is not completed.',
      );
    }

    if (Number(appointment.patientId) !== Number(patient.id)) {
      throw new ForbiddenException(
        'You are not authorized to rate this appointment.',
      );
    }

    // الفحص الذكي: نمنع المريض فقط إذا كان لديه تقييم الحالي "نشط وظاهر" لنفس الموعد
    const activeRatingExists = await this.ratingRepository.findOne({
      where: {
        appointmentId: dto.appointmentId,
        patientProfileId: patient.id,
        status: RatingStatus.VISIBLE, // الفحص يعتمد على الحالة النشطة فقط
      },
    });

    if (activeRatingExists) {
      throw new ConflictException('You already have an active rating for this appointment.');
    }

    // إنشاء سجل جديد كلياً في قاعدة البيانات (حتى لو كان هناك سجل قديم بحالة DELETED)
    const rating = this.ratingRepository.create({
      appointmentId: dto.appointmentId,
      patientProfileId: patient.id,
      doctorProfileId: appointment.doctorId,
      score: dto.score,
      comment: dto.comment ?? null,
      status: RatingStatus.VISIBLE,
    });

    const savedRating = await this.ratingRepository.save(rating);
    
    // تحديث المتوسطات بناءً على السجل الجديد الفعال
    await this.syncAverages(Number(appointment.doctorId));
    
    return savedRating;
  }

  async updateRating(
    ratingId: number,
    userId: number,
    dto: CreateRatingDto,
  ): Promise<Rating> {
    const patient = await this.patientProfileRepository.findOne({
      where: { userId },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found.');
    }

    if (Number(rating.patientProfileId) !== Number(patient.id)) {
      throw new ForbiddenException(
        'You are not authorized to update this rating.',
      );
    }

    rating.score = dto.score;
    rating.comment = dto.comment ?? null;
    rating.status = RatingStatus.VISIBLE;

    const savedRating = await this.ratingRepository.save(rating);
    await this.syncAverages(Number(rating.doctorProfileId));
    return savedRating;
  }

  async deleteRating(
    ratingId: number,
    userId: number,
  ): Promise<{ message: string }> {
    const patient = await this.patientProfileRepository.findOne({
      where: { userId },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found.');
    }

    if (Number(rating.patientProfileId) !== Number(patient.id)) {
      throw new ForbiddenException(
        'You are not authorized to delete this rating.',
      );
    }

    rating.status = RatingStatus.DELETED;
    await this.ratingRepository.save(rating);
    await this.syncAverages(Number(rating.doctorProfileId));
    return { message: 'Rating deleted successfully.' };
  }

  async reportRating(
    ratingId: number,
    userId: number,
    dto: ReportRatingDto,
  ): Promise<RatingReport> {
    const patient = await this.patientProfileRepository.findOne({
      where: { userId },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found.');
    }

    if (Number(rating.patientProfileId) === Number(patient.id)) {
      throw new BadRequestException('You cannot report your own rating.');
    }

    const alreadyReported = await this.reportRepository.findOne({
      where: {
        ratingId,
        reporterPatientId: patient.id,
      },
    });

    if (alreadyReported) {
      throw new BadRequestException('You have already reported this rating.');
    }

    const report = this.reportRepository.create({
      ratingId,
      reporterPatientId: patient.id,
      reason: dto.reason,
      explanation: dto.explanation ?? null,
      status: ReportStatus.PENDING,
    });

    return await this.reportRepository.save(report);
  }

  async getDoctorRatings(doctorId: number, query: RatingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.patientProfile', 'patientProfile')
      .leftJoinAndSelect('patientProfile.user', 'user')
      .where('rating.doctor_profile_id = :doctorId', { doctorId })
      .andWhere('rating.status = :status', { status: RatingStatus.VISIBLE })
      .orderBy('rating.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async getPatientOwnRatings(userId: number, query: RatingQueryDto) {
    const patient = await this.patientProfileRepository.findOne({
      where: { userId },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.doctorProfile', 'doctorProfile')
      .where('rating.patient_profile_id = :patientId', {
        patientId: patient.id,
      })
      // الفلترة الذكية: المريض يرى فقط تقييماته الفعالة والظاهرة للعامة
      .andWhere('rating.status = :status', { status: RatingStatus.VISIBLE })
      .orderBy('rating.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async adminGetAllRatings(query: any) {
    const queryBuilder = this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.patientProfile', 'patientProfile')
      .leftJoinAndSelect('patientProfile.user', 'user')
      .leftJoinAndSelect('rating.doctorProfile', 'doctorProfile');

    if (query.status) {
      queryBuilder.andWhere('rating.status = :status', {
        status: query.status,
      });
    }

    if (query.score) {
      queryBuilder.andWhere('rating.score = :score', { score: query.score });
    }

    if (query.doctorId) {
      queryBuilder.andWhere('rating.doctor_profile_id = :doctorId', {
        doctorId: query.doctorId,
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    queryBuilder.orderBy('rating.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async adminUpdateRatingStatus(
    ratingId: number,
    status: RatingStatus,
  ): Promise<Rating> {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found.');
    }

    rating.status = status;
    const savedRating = await this.ratingRepository.save(rating);
    await this.syncAverages(Number(rating.doctorProfileId));
    return savedRating;
  }

  async adminGetAllReports(query: any) {
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporterPatient', 'reporterPatient')
      .leftJoinAndSelect('reporterPatient.user', 'user')
      .leftJoinAndSelect('report.rating', 'rating')
      .leftJoinAndSelect('rating.doctorProfile', 'doctorProfile');

    if (query.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: query.status,
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    queryBuilder.orderBy('report.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async adminResolveReport(
    reportId: number,
    adminId: number,
    action: 'accept' | 'dismiss',
  ): Promise<RatingReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['rating'],
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Report has already been resolved.');
    }

    report.resolvedAt = new Date();
    report.resolvedByAdminId = adminId;

    if (action === 'accept') {
      report.status = ReportStatus.RESOLVED;
      if (report.rating) {
        report.rating.status = RatingStatus.HIDDEN;
        await this.ratingRepository.save(report.rating);
        await this.syncAverages(Number(report.rating.doctorProfileId));
      }
    } else if (action === 'dismiss') {
      report.status = ReportStatus.DISMISSED;
    }

    return await this.reportRepository.save(report);
  }

  async calculateDoctorAverageRating(doctorId: number): Promise<number> {
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.score)', 'average')
      .where('rating.doctor_profile_id = :doctorId', { doctorId })
      .andWhere('rating.status = :status', { status: RatingStatus.VISIBLE })
      .getRawOne();

    if (!result || result.average === null) {
      return 0.0;
    }

    return Number(Number(result.average).toFixed(1));
  }

  async calculateClinicAverageRating(clinicId: number): Promise<number> {
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.score)', 'average')
      .innerJoin(DoctorClinic, 'dc', 'dc.doctor_id = rating.doctor_profile_id')
      .where('dc.clinic_id = :clinicId', { clinicId })
      .andWhere('rating.status = :status', { status: RatingStatus.VISIBLE })
      .getRawOne();

    if (!result || result.average === null) {
      return 0.0;
    }

    return Number(Number(result.average).toFixed(1));
  }
}
