import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from './entities/queue.entity';
import { QueueStatus } from './enums/queue-status.enum';

const NO_SHOW_TIMEOUT_MINUTES = 10;

@Injectable()
export class QueueCronService {
  private readonly logger = new Logger(QueueCronService.name);

  constructor(
    @InjectRepository(Queue) private readonly queues: Repository<Queue>,
  ) {}

  // كل منتصف ليل: أي سجل بقي WAITING أو CALLING من يوم سابق → EXPIRED
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredQueues(): Promise<void> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const result = await this.queues
      .createQueryBuilder()
      .update(Queue)
      .set({ status: QueueStatus.EXPIRED })
      .where('created_at < :start', { start })
      .andWhere('status IN (:...statuses)', {
        statuses: [QueueStatus.WAITING, QueueStatus.CALLING],
      })
      .execute();

    this.logger.log(`Expired ${result.affected ?? 0} leftover queue entries.`);
  }

  // كل 5 دقائق: مريض استُدعي (CALLING) ولم يحضر خلال المهلة → NO_SHOW
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleNoShowPatients(): Promise<void> {
    const threshold = new Date(Date.now() - NO_SHOW_TIMEOUT_MINUTES * 60000);

    const result = await this.queues
      .createQueryBuilder()
      .update(Queue)
      .set({ status: QueueStatus.NO_SHOW })
      .where('status = :status', { status: QueueStatus.CALLING })
      .andWhere('updated_at < :threshold', { threshold })
      .execute();

    this.logger.log(`Marked ${result.affected ?? 0} patients as no-show.`);
  }
}