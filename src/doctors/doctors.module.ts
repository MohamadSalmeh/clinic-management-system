import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctorProfile, User]),
    forwardRef(() => AuthModule),
    JwtModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService, TypeOrmModule],
})
export class DoctorsModule {}
