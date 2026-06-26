import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AppointmentsService } from './appointments.service';

@Injectable()
export class AppointmentsCron {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Cron('0 5 0 * * *')
  async handleDailyNoShows(): Promise<void> {
    await this.appointmentsService.processDailyNoShows();
  }
}
