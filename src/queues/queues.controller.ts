import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards, Body, NotFoundException } from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { QueuesService } from './queues.service';
import { QueueQueryDto } from './dto/queue-query.dto';
import { Queue } from './entities/queue.entity';
import { QueueResponseDto } from './dto/queue-response.dto';

@Controller('queues')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) { }

  @Patch('check-in/:appointmentId')
  @Roles(UserRole.ADMIN)
  async checkInPatient(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto> {
    const queue = await this.queuesService.createQueueEntry(
      appointmentId,
      currentUser,
    );

    return this.queuesService.toQueueResponseDto(queue);
  }

  @Get('doctor/my-queue')
  @Roles(UserRole.DOCTOR)
  async getDoctorQueue(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto[]> {
    const queues = await this.queuesService.getDoctorLiveQueue(
      currentUser.sub,
    );

    return Promise.all(
      queues.map((queue) =>
        this.queuesService.toQueueResponseDto(queue),
      ),
    );
  }

  @Patch('doctor/call-next')
  @Roles(UserRole.DOCTOR)
  async callNextPatient(
    @Query('clinicId', ParseIntPipe) clinicId: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto> {
    const queue = await this.queuesService.callNextPatient(
      currentUser.sub,
      clinicId,
    );

    return this.queuesService.toQueueResponseDto(queue);
  }

  @Patch(':id/start-consultation')
  @Roles(UserRole.DOCTOR)
  async startConsultation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto> {
    const queue = await this.queuesService.startConsultation(
      id,
      currentUser,
    );

    return this.queuesService.toQueueResponseDto(queue);
  }

  @Patch(':id/complete')
  @Roles(UserRole.DOCTOR)
  async completeConsultation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto> {
    const queue = await this.queuesService.completeConsultation(
      id,
      currentUser,
    );

    return this.queuesService.toQueueResponseDto(queue);
  }

  @Get('admin/live')
  @Roles(UserRole.ADMIN)
  async getLiveQueueForAdmin(
    @Query() query: QueueQueryDto,
  ): Promise<QueueResponseDto[]> {
    const queues = await this.queuesService.getLiveQueueForAdmin(query);

    return Promise.all(
      queues.map((queue) =>
        this.queuesService.toQueueResponseDto(queue),
      ),
    );
  }
  @Patch(':id/skip')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  async skipPatient(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto> {
    const queue = await this.queuesService.skipPatient(
      id,
      currentUser,
    );

    return this.queuesService.toQueueResponseDto(queue);
  }



  @Get('patient/live-status/:appointmentId')
  @Roles(UserRole.PATIENT)
  async getPatientLiveStatus(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto> {
    const queue = await this.queuesService.getPatientLiveStatus(
      appointmentId,
      currentUser,
    );

    return this.queuesService.toQueueResponseDto(queue);
  }

  @Get('patient/my-active-queue')
  @Roles(UserRole.PATIENT)
  async getPatientActiveQueue(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<QueueResponseDto> {
    const queue = await this.queuesService.getPatientActiveQueue(
      currentUser,
    );

    if (!queue) {
      throw new NotFoundException(
        'لا يوجد طابور نشط لهذا المستخدم حالياً.',
      );
    }

    return this.queuesService.toQueueResponseDto(queue);
  }

  @Get('admin/metrics')
  @Roles(UserRole.ADMIN)
  getQueueMetrics(@Query() query: QueueQueryDto) {
    return this.queuesService.getQueueMetrics(query);
  }
}