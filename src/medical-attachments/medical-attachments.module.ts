import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalAttachment } from './entities/medical-attachment.entity';

@Module({
	imports: [TypeOrmModule.forFeature([MedicalAttachment])],
	exports: [TypeOrmModule],
})
export class MedicalAttachmentsModule {}
