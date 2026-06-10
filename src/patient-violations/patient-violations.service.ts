import {
    Injectable,
} from '@nestjs/common';

import {
    InjectRepository,
} from '@nestjs/typeorm';

import {
    Repository,
} from 'typeorm';

import { PatientViolation } from './entities/patient-violation.entity';

@Injectable()
export class PatientViolationsService {

    constructor(

        @InjectRepository(PatientViolation)
        private readonly patientViolationRepository:
            Repository<PatientViolation>,

    ) { }

    async getMyViolations(
        userId: number,
    ): Promise<PatientViolation[]> {

        return this.patientViolationRepository.find({

            where: {

                userId,

            },

            order: {

                created_at: 'DESC',

            },

        });

    }

    async getUserViolations(
        userId: number,
    ): Promise<PatientViolation[]> {

        return this.patientViolationRepository.find({

            where: {

                userId,

            },

            order: {

                created_at: 'DESC',

            },

        });

    }

    async getMyViolationCount(
        userId: number,
    ): Promise<number> {

        return this.patientViolationRepository.count({

            where: {

                userId,

            },

        });

    }

}