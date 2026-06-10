import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { Rating } from './entities/rating.entity';
import { RatingReport } from './entities/rating-report.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { AuthModule } from '../auth';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, RatingReport, PatientProfile]),
    AuthModule,
    // الـ forwardRef لحل التعليق الدائري مع موديول المواعيد
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService], // تصدير الخدمة لتستفيد منها الموديولات الأخرى كالإحصائيات
})
export class RatingsModule {}
