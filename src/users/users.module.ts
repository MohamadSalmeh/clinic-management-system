import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { AuthModule } from '../auth';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserAccessProvider } from './providers';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule,
    TypeOrmModule.forFeature([User, PatientProfile]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserAccessProvider],
  exports: [TypeOrmModule, UsersService, UserAccessProvider],
})
export class UsersModule {}
