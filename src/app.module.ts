import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'clinic_system',
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      ssl:
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
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
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
