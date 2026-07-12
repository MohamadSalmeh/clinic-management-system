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
import { MyPaymentQueryDto } from './dto/payment-query.dto';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { nowDate } from '../common/utils/date-utils';
import { WalletTransactionEvent } from '../notifications/events';
import { EventEmitter2 } from '@nestjs/event-emitter';

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

        @InjectRepository(PatientProfile)
        private readonly patientRepository: Repository<PatientProfile>,

        private readonly eventEmitter: EventEmitter2,

    ) { }
    async getMyPayments(
        userId: number,
        query: MyPaymentQueryDto,
    ): Promise<Payment[]> {

        const qb = this.paymentRepository
            .createQueryBuilder('payment')
            .leftJoinAndSelect('payment.appointment', 'appointment')
            .leftJoinAndSelect('appointment.doctor', 'doctor')
            .leftJoinAndSelect('doctor.user', 'doctorUser')
            .leftJoinAndSelect('appointment.clinic', 'clinic')
            .where('payment.userId = :userId', { userId });

        if (query.status) {
            qb.andWhere('payment.status = :status', {
                status: query.status,
            });
        }

        return qb
            .orderBy('payment.created_at', 'DESC')
            .getMany();
    }
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
    async payOperation(
        userId: number,
        appointmentId: number,
    ): Promise<Payment> {

        const appointment = await this.appointmentRepository.findOne({
            where: {
                id: appointmentId,
            },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        if (appointment.type !== 'Operation') {
            throw new BadRequestException(
                'This appointment is not an operation.',
            );
        }

        const patient = await this.patientRepository.findOne({
            where: {
                id: appointment.patientId,
            },
        });

        if (!patient || Number(patient.userId) !== Number(userId)) {
            throw new BadRequestException(
                'You can only pay for your own operation.',
            );
        }

        const existingPayment = await this.paymentRepository.findOne({
            where: {
                appointmentId,
            },
        });

        if (existingPayment) {
            throw new BadRequestException(
                'Operation has already been paid.',
            );
        }

        const operationFee = Number(appointment.operationCost);

        if (operationFee <= 0) {
            throw new BadRequestException(
                'Invalid operation cost.',
            );
        }
        return this.dataSource.transaction(async (manager) => {

            const walletRepository = manager.getRepository(Wallet);

            const wallet = await walletRepository.findOne({
                where: {
                    userId,
                },
            });

            if (!wallet) {
                throw new NotFoundException('Wallet not found');
            }

            if (Number(wallet.availableBalance) < operationFee) {
                throw new BadRequestException(
                    'Insufficient wallet balance',
                );
            }

            wallet.availableBalance = (
                Number(wallet.availableBalance) - operationFee
            ).toFixed(2);

            wallet.frozenBalance = (
                Number(wallet.frozenBalance) + operationFee
            ).toFixed(2);

            await walletRepository.save(wallet);

            const payment = manager.getRepository(Payment).create({
                appointmentId: appointment.id,

                walletId: wallet.id,

                userId,

                amount: operationFee.toFixed(2),

                appointmentType: appointment.type,

                paymentMethod: PaymentMethod.WALLET,

                status: PaymentStatus.HELD,

                penaltyAmount: '0',

                refundAmount: '0',

                paidAt: nowDate(),
            });

            const savedPayment = await manager
                .getRepository(Payment)
                .save(payment);

            appointment.status = 'confirmed';

            await manager
                .getRepository(Appointment)
                .save(appointment);

            await this.eventEmitter.emitAsync(
                WalletTransactionEvent.eventName,
                new WalletTransactionEvent({
                    userId,
                    appointmentId: appointment.id,
                    action: 'FREEZE',
                    amount: operationFee.toFixed(2),
                    balanceAfter: wallet.availableBalance,
                }),
            );

            return savedPayment;
        });


    }
}