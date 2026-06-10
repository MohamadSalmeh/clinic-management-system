import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    InjectRepository,
} from '@nestjs/typeorm';

import {
    DataSource,
    Repository,
} from 'typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Wallet } from '../wallets/entities/wallet.entity';

import { Payment } from './entities/payment.entity';

import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';

@Injectable()
export class PaymentsService {

    constructor(

        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,

        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,

        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,

        @InjectRepository(DoctorProfile)
        private readonly doctorRepository: Repository<DoctorProfile>,

        private readonly dataSource: DataSource,

    ) { }

   /* async payAppointment(
        userId: number,
        appointmentId: number,
    ) {

        return this.dataSource.transaction(
            async manager => {

                const appointment =
                    await manager
                        .getRepository(Appointment)
                        .findOne({

                            where: {
                                id: appointmentId,
                            },

                            relations: {
                                patient: true,
                            },

                        });

                if (!appointment) {

                    throw new NotFoundException(
                        'Appointment not found',
                    );

                }

                if (
                    appointment.status !== 'pending'
                ) {

                    throw new BadRequestException(
                        'Appointment is not pending',
                    );

                }

                const existingPayment =
                    await manager
                        .getRepository(Payment)
                        .findOne({

                            where: {
                                appointmentId,
                            },

                        });

                if (existingPayment) {

                    throw new BadRequestException(
                        'Appointment already paid',
                    );

                }

                const doctor =
                    await manager
                        .getRepository(DoctorProfile)
                        .findOne({

                            where: {
                                id: appointment.doctorId,
                            },

                        });

                if (!doctor) {

                    throw new NotFoundException(
                        'Doctor not found',
                    );

                }

                let fee = 0;

                if (
                    appointment.type ===
                    'Initial Visit'
                ) {

                    fee = Number(
                        doctor.initialVisitFee,
                    );

                }

                else {

                    fee = Number(
                        doctor.returnVisitFee,
                    );

                }

                const wallet =
                    await manager
                        .getRepository(Wallet)
                        .findOne({

                            where: {
                                userId,
                            },

                        });

                if (!wallet) {

                    throw new NotFoundException(
                        'Wallet not found',
                    );

                }

                if (
                    Number(
                        wallet.availableBalance,
                    ) < fee
                ) {

                    throw new BadRequestException(
                        'Insufficient balance',
                    );

                }

                wallet.availableBalance =
                    (
                        Number(
                            wallet.availableBalance,
                        ) - fee
                    ).toFixed(2);

                wallet.frozenBalance =
                    (
                        Number(
                            wallet.frozenBalance,
                        ) + fee
                    ).toFixed(2);

                await manager
                    .getRepository(Wallet)
                    .save(wallet);

                const payment =
                    manager
                        .getRepository(Payment)
                        .create({

                            appointmentId,

                            walletId:
                                wallet.id,

                            userId,

                            amount:
                                fee.toFixed(2),

                            appointmentType:
                                appointment.type,

                            paymentMethod:
                                PaymentMethod.WALLET,

                            status:
                                PaymentStatus.HELD,

                            penaltyAmount:
                                '0',

                            refundAmount:
                                '0',

                            paidAt:
                                new Date(),

                        });

                await manager
                    .getRepository(Payment)
                    .save(payment);

                appointment.status =
                    'confirmed';

                await manager
                    .getRepository(Appointment)
                    .save(appointment);

                return payment;

            },
        );

    }*/

}