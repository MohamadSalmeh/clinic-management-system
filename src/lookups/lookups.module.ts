import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lookup } from './entities/lookup.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Lookup])],
  exports: [ TypeOrmModule],
})
export class LookupsModule {}
