import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DoctorClinicsModule } from './doctor-clinics/doctor-clinics.module';
import { DoctorSchedulesModule } from './doctor-schedules/doctor-schedules.module';
import { DoctorsModule } from './doctors/doctors.module';
import { LookupsModule } from './lookups/lookups.module';
import { MedicalProfileLogsModule } from './medical-profile-logs/medical-profile-logs.module';
import { MedicalProfilesModule } from './medical-profiles/medical-profiles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientsModule } from './patients/patients.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { RatingsModule } from './ratings/ratings.module';
import { PaymentsModule } from './payments/payments.module';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make the ConfigModule available globally
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
          synchronize: process.env.NODE_ENV !== 'production', // Synchronize only in non-production environments
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
        };
      },
    }),

    UsersModule,
    AppointmentsModule,
    DoctorsModule,
    PatientsModule,
    ClinicsModule,
    DoctorClinicsModule,
    DoctorSchedulesModule,
    LookupsModule,
    MedicalProfileLogsModule,
    MedicalProfilesModule,
    NotificationsModule,
    WalletsModule,
    RatingsModule,
    PaymentsModule,
    QueuesModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
