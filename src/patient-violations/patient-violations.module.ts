import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';

import { PatientViolation } from './entities/patient-violation.entity';

import { PatientViolationsController } from './patient-violations.controller';
import { PatientViolationsService } from './patient-violations.service';

@Module({

    imports: [

        TypeOrmModule.forFeature([
            PatientViolation,
        ]),

        AuthModule,

    ],

    controllers: [

        PatientViolationsController,

    ],

    providers: [

        PatientViolationsService,

    ],

    exports: [

        PatientViolationsService,

    ],

})
export class PatientViolationsModule { }