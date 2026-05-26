import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorAdminLog, DoctorAdminLogType } from './entities/doctor-admin-log.entity';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { DoctorAdminLogQueryDto } from './dto';

@Injectable()
export class DoctorAdminLogsService {
  constructor(
    @InjectRepository(DoctorAdminLog)
    private readonly doctorAdminLogRepository: Repository<DoctorAdminLog>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  async createLog(
    doctorProfileId: number,
    type: DoctorAdminLogType,
    fieldName: string | null,
    oldValue: string | null,
    newValue: string | null,
    changedById: number,
    reason: string | null,
  ): Promise<DoctorAdminLog> {
    const log = this.doctorAdminLogRepository.create({
      doctorProfileId,
      type,
      fieldName,
      oldValue,
      newValue,
      changedById,
      reason,
    });

    return this.doctorAdminLogRepository.save(log);
  }

  async getLogsForCurrentDoctor(
    userId: number,
    query: DoctorAdminLogQueryDto,
  ): Promise<DoctorAdminLog[]> {
    const profile = await this.doctorProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.getLogsForAdmin({
      ...query,
      doctorProfileId: profile.id,
    });
  }

  async getLogsForAdmin(query: DoctorAdminLogQueryDto): Promise<DoctorAdminLog[]> {
    const qb = this.doctorAdminLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.doctorProfile', 'doctorProfile')
      .where('1 = 1');

    if (query.doctorProfileId) {
      qb.andWhere('log.doctorProfileId = :doctorProfileId', {
        doctorProfileId: query.doctorProfileId,
      });
    }

    if (query.type) {
      qb.andWhere('log.type = :type', { type: query.type });
    }

    if (query.fromDate) {
      qb.andWhere('log.created_at >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      qb.andWhere('log.created_at <= :toDate', { toDate: query.toDate });
    }

    return qb.orderBy('log.created_at', 'DESC').getMany();
  }
}
