import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { User } from '../users/entities/user.entity';
import { DoctorAdminLog } from './entities/doctor-admin-log.entity';
import { DoctorAdminLogsService } from './doctor-admin-logs.service';
import { DoctorAdminLogsController } from './doctor-admin-logs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctorProfile, User, DoctorAdminLog]),
    forwardRef(() => AuthModule),
    JwtModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [DoctorsController, DoctorAdminLogsController],
  providers: [DoctorsService, DoctorAdminLogsService],
  exports: [DoctorsService, DoctorAdminLogsService, TypeOrmModule],
})
export class DoctorsModule {}
