import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Queue } from './entities/queue.entity';
import { QueueStatus } from './enums/queue-status.enum';
import { nowDate } from '../common/utils/date-utils';

@Injectable()
export class QueueTimeoutService {
    private readonly CALLING_TIMEOUT_MINUTES = 5;

    constructor(
        @InjectRepository(Queue)
        private readonly queueRepository: Repository<Queue>,
    ) { }

    @Cron('*/5 * * * *')
    async processCallingTimeouts(): Promise<void> {
        const timeoutBefore = new Date(
            nowDate().getTime() -
            this.CALLING_TIMEOUT_MINUTES * 60 * 1000,
        );

        await this.queueRepository
            .createQueryBuilder()
            .update(Queue)
            .set({
                status: QueueStatus.SKIPPED,
                skippedAt: nowDate(),
            })
            .where('status = :status', {
                status: QueueStatus.CALLING,
            })
            .andWhere('called_at IS NOT NULL')
            .andWhere('called_at <= :timeoutBefore', {
                timeoutBefore,
            })
            .execute();
    }
}