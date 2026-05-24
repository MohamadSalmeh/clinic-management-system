import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalHistory } from './entities/medical-history.entity';

@Module({
	imports: [TypeOrmModule.forFeature([MedicalHistory])],
	exports: [TypeOrmModule],
})
export class MedicalHistoriesModule {}
