import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity';
import { CreateClinicDto, UpdateClinicDto } from './dto';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity';
import { ClinicStatus } from './enums/clinic-status.enum';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
  ) {}

  async create(dto: CreateClinicDto): Promise<Clinic> {
    const clinic = this.clinicRepository.create({
      name: dto.name,
      description: dto.description,
      location: dto.location,
      status: dto.status ?? ClinicStatus.ACTIVE,
    });

    return this.clinicRepository.save(clinic);
  }

  async findAll(): Promise<Clinic[]> {
    return this.clinicRepository.find({
      where: { status: ClinicStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({ where: { id } });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return clinic;
  }

  async update(id: number, dto: UpdateClinicDto): Promise<Clinic> {
    const clinic = await this.findOne(id);

    if (dto.name !== undefined) {
      clinic.name = dto.name;
    }

    if (dto.description !== undefined) {
      clinic.description = dto.description;
    }

    if (dto.location !== undefined) {
      clinic.location = dto.location;
    }

    if (dto.status !== undefined) {
      clinic.status = dto.status;
    }

    return this.clinicRepository.save(clinic);
  }

  async remove(id: number): Promise<Clinic> {
    const clinic = await this.findOne(id);
    const assignmentCount = await this.doctorClinicRepository.count({
      where: { clinicId: id },
    });

    if (assignmentCount > 0) {
      throw new BadRequestException(
        'Clinic cannot be deleted while doctors are assigned',
      );
    }

    clinic.status = ClinicStatus.CLOSED;
    return this.clinicRepository.save(clinic);
  }
}
