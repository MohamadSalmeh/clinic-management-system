import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminDoctorStatusUpdateResult, DoctorStatusUpdateAction } from './interfaces/admin-doctor.interface';

// تأكد من صحة المسارات حسب مشروعك
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { DoctorProfileStatus } from '../users/enums/doctor-profile-status.enum';

@Injectable()
export class AdminDoctorsService {
  private readonly logger = new Logger(AdminDoctorsService.name);

  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  /**
   * Deactivates a doctor without deleting historical data.
   */
  public async deactivateDoctor(doctorId: number): Promise<AdminDoctorStatusUpdateResult> {
    try {
      const doctor = await this.doctorProfileRepository.findOne({
        where: { id: doctorId },
      });

      if (!doctor) {
        throw new NotFoundException(`Doctor #${doctorId} not found`);
      }

      // التحقق مما إذا كان الطبيب غير نشط بالفعل
      if (doctor.status === DoctorProfileStatus.INACTIVE) {
        return {
          success: true,
          message: 'Doctor is already inactive',
          doctorId,
          status: DoctorProfileStatus.INACTIVE,
        };
      }

      // تحديث الحالة إلى INACTIVE
      doctor.status = DoctorProfileStatus.INACTIVE;
      await this.doctorProfileRepository.save(doctor);

      return {
        success: true,
        message: 'Doctor deactivated successfully',
        doctorId,
        status: DoctorProfileStatus.INACTIVE,
      };
    } catch (error) {
      this.logger.error('Failed to deactivate doctor', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}