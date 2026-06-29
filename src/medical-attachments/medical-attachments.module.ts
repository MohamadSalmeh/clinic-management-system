import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalAttachment } from './entities/medical-attachment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalAttachmentsController } from './medical-attachments.controller';
import { MedicalAttachmentsService } from './medical-attachments.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { AppointmentAccessModule } from '../appointment-access/appointment-access.module';
import { AuthModule } from '../auth';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			MedicalAttachment,
			MedicalHistory,
			MedicalProfile,
			Appointment,
			DoctorProfile,
			PatientProfile,
		]),
		AppointmentAccessModule,
		AuthModule,
	],

	controllers: [MedicalAttachmentsController],

	providers: [
		MedicalAttachmentsService,
		FileStorageService,
	],

	exports: [
		MedicalAttachmentsService,
	],
})
export class MedicalAttachmentsModule { }
