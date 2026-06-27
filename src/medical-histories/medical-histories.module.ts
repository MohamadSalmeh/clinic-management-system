import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';

import { MedicalHistory } from './entities/medical-history.entity';

import { Appointment } from '../appointments/entities/appointment.entity';

import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';

import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';

import { PatientProfile } from '../patients/entities/patient-profile.entity';

import { MedicalHistoriesController } from './medical-histories.controller';

import { MedicalHistoriesService } from './medical-histories.service';

@Module({

    imports: [

        TypeOrmModule.forFeature([

            MedicalHistory,

            Appointment,

            DoctorProfile,

            MedicalProfile,

            PatientProfile,

        ]),

        AuthModule,

    ],

    controllers: [

        MedicalHistoriesController,

    ],

    providers: [

        MedicalHistoriesService,

    ],

    exports: [

        MedicalHistoriesService,

    ],

})
export class MedicalHistoriesModule {}