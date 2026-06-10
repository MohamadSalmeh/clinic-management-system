import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DoctorClinicsModule } from './doctor-clinics/doctor-clinics.module';
import { DoctorSchedulesModule } from './doctor-schedules/doctor-schedules.module';
import { DoctorsModule } from './doctors/doctors.module';
import { LookupsModule } from './lookups/lookups.module';
import { MedicalProfileLogsModule } from './medical-profile-logs/medical-profile-logs.module';
import { MedicalProfilesModule } from './medical-profiles/medical-profiles.module';
import { MedicalAttachmentsModule } from './medical-attachments/medical-attachments.module';
import { MedicalHistoriesModule } from './medical-histories/medical-histories.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientsModule } from './patients/patients.module';
import { ReferralsModule } from './referrals/referrals.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { RatingsModule } from './ratings/ratings.module';
import { PaymentsModule } from './payments/payments.module';
import { PrescribedMedicinesModule } from './prescribed-medicines/prescribed-medicines.module';
import { QueuesModule } from './queues/queues.module';
import { AdminsModule } from './admins/admins.module';
import { DoctorLeavesModule } from './doctor-leaves/doctor-leaves.module';
import { SystemSettingsModule } from './system-setting/system-settings.module';
import { PatientViolationsModule } from './patient-violations/patient-violations.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV
        ? `.env.${process.env.NODE_ENV}`
        : '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return {
          type: 'postgres',
          database: config.get<string>('DB_DB'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
        };
      },
    }),
    ScheduleModule.forRoot(),
    SystemSettingsModule,
    UsersModule,
    AuthModule,
    AppointmentsModule,
    DoctorsModule,
    PatientsModule,
    ClinicsModule,
    DoctorClinicsModule,
    DoctorSchedulesModule,
    LookupsModule,
    MedicalProfileLogsModule,
    MedicalProfilesModule,
    MedicalAttachmentsModule,
    MedicalHistoriesModule,
    NotificationsModule,
    WalletsModule,
    RatingsModule,
    PaymentsModule,
    PrescribedMedicinesModule,
    QueuesModule,
    AdminsModule,
    ReferralsModule,
    TransactionsModule,
    DoctorLeavesModule,
    PatientViolationsModule
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule { }