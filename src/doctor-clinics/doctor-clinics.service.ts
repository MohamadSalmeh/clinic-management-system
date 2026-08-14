import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorClinic } from './entities/doctor-clinic.entity';
import { AssignDoctorDto } from './dto';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { ClinicStatus } from '../clinics/enums/clinic-status.enum';
import { DoctorProfileStatus } from '../users/enums/doctor-profile-status.enum';
@Injectable()
export class DoctorClinicsService {
  constructor(
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  async assignDoctor(dto: AssignDoctorDto): Promise<DoctorClinic> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: dto.clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    if (clinic.status !== ClinicStatus.ACTIVE) {
      throw new BadRequestException('Clinic is not active');
    }

    const doctor = await this.doctorProfileRepository.findOne({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const existingAssignment = await this.doctorClinicRepository.findOne({
      where: { clinicId: dto.clinicId, doctorId: dto.doctorId },
    });

    if (existingAssignment) {
      throw new ConflictException('Doctor already assigned to this clinic');
    }

    const assignment = this.doctorClinicRepository.create({
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
    });

    return this.doctorClinicRepository.save(assignment);
  }

  async unassignDoctor(clinicId: number, doctorId: number): Promise<void> {
    const assignment = await this.doctorClinicRepository.findOne({
      where: { clinicId, doctorId },
    });

    if (!assignment) {
      throw new NotFoundException('Doctor assignment not found');
    }

    await this.doctorClinicRepository.remove(assignment);
  }

  async getClinicsForDoctor(doctorId: number): Promise<Clinic[]> {
    const doctor = await this.doctorProfileRepository.findOne({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const assignments = await this.doctorClinicRepository.find({
      where: { doctorId },
      relations: { clinic: true },
    });

    return assignments.map((assignment) => assignment.clinic);
  }

  /*async getDoctorsInClinic(clinicId: number): Promise<DoctorProfile[]> {
    const clinic = await this.clinicRepository.findOne({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const assignments = await this.doctorClinicRepository.find({
      where: { clinicId },
      relations: { doctor: true },
    });

    return assignments.map((assignment) => assignment.doctor);
  }*/
 async getDoctorsInClinic(
  clinicId: number,
): Promise<DoctorProfile[]> {
  const clinic = await this.clinicRepository.findOne({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new NotFoundException('Clinic not found');
  }

  const assignments = await this.doctorClinicRepository.find({
    where: { clinicId },
    relations: {
      doctor: {
        user: true,
      },
    },
  });

  return assignments
    .map((assignment) => assignment.doctor)
    .filter((doctor) => {
      // 1. Doctor must be active
      if (doctor.status !== DoctorProfileStatus.ACTIVE) {
        return false;
      }

      // 2. Doctor profile must be complete
      const user = doctor.user;

      const profileComplete =
        !!user?.birthDate &&
        !!user?.gender &&
        !!doctor.licenseNumber?.trim() &&
        !!doctor.specialization?.trim() &&
        !!doctor.subSpecialization?.trim();

      if (!profileComplete) {
        return false;
      }

      // 3. Assignment to this clinic is already guaranteed
      //    because we queried by clinicId.
      return true;
    });
}

}
