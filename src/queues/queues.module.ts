import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from './entities/queue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Queue])],
})
export class QueuesModule {}
