import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';

import { FavoriteDoctor } from './entities/favorite-doctor.entity';
import { FavoriteDoctorsController } from './favorite-doctors.controller';
import { FavoriteDoctorsService } from './favorite-doctors.service';

import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { AuthModule } from '../auth';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            FavoriteDoctor,
            PatientProfile,
            DoctorProfile,
        ]),
        forwardRef(() => AuthModule),
        PatientsModule,
        DoctorsModule,
    ],
    controllers: [FavoriteDoctorsController],
    providers: [FavoriteDoctorsService],
    exports: [FavoriteDoctorsService],
})
export class FavoriteDoctorsModule { }