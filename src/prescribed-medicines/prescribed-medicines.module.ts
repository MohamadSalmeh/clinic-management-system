import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescribedMedicine } from './entities/prescribed-medicine.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PrescribedMedicine])],
  exports: [TypeOrmModule],
})
export class PrescribedMedicinesModule {}
