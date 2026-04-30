import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { DoctorInvitation } from './entities/doctor-invitation.entity';
import { DoctorInvitationsService } from './doctor-invitations.service';

@Module({
    imports: [TypeOrmModule.forFeature([DoctorInvitation]), MailModule],
    providers: [DoctorInvitationsService],
    exports: [DoctorInvitationsService, TypeOrmModule],
})
export class DoctorInvitationsModule { }
