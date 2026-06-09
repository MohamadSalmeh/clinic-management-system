import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards, Body } from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { QueuesService } from './queues.service';
import { QueueQueryDto } from './dto/queue-query.dto';
import { ReorderQueueDto } from './dto/reorder-queue.dto';
import { Queue } from './entities/queue.entity';

@Controller('queues')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Patch('check-in/:appointmentId')
  @Roles(UserRole.ADMIN)
  checkInPatient(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<Queue> {
    return this.queuesService.createQueueEntry(appointmentId, currentUser);
  }

  @Get('doctor/my-queue')
  @Roles(UserRole.DOCTOR)
  getDoctorQueue(@CurrentUser() currentUser: ActiveUserData): Promise<Queue[]> {
    return this.queuesService.getDoctorLiveQueue(currentUser.sub);
  }

@Patch('doctor/call-next')
  @Roles(UserRole.DOCTOR)
  async callNextPatient(
    @Query('clinicId', ParseIntPipe) clinicId: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<Queue> {
    // نمرر الـ sub (User ID) كبارامتر أول والـ clinicId كبارامتر ثاني
    return this.queuesService.callNextPatient(currentUser.sub, clinicId);
  }

  @Patch(':id/start-consultation')
  @Roles(UserRole.DOCTOR)
  startConsultation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<Queue> {
    return this.queuesService.startConsultation(id, currentUser);
  }

  @Patch(':id/complete')
  @Roles(UserRole.DOCTOR)
  completeConsultation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<Queue> {
    return this.queuesService.completeConsultation(id, currentUser);
  }

  @Get('admin/live')
  @Roles(UserRole.ADMIN)
  getLiveQueueForAdmin(@Query() query: QueueQueryDto): Promise<Queue[]> {
    return this.queuesService.getLiveQueueForAdmin(query);
  }

  @Patch(':id/skip')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  skipPatient(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<Queue> {
    return this.queuesService.skipPatient(id, currentUser);
  }

  @Patch(':id/re-order')
  @Roles(UserRole.ADMIN)
  reorderQueue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderQueueDto,
  ): Promise<Queue> {
    return this.queuesService.reorderQueue(id, dto.newPosition);
  }

  @Get('patient/live-status/:appointmentId')
  getPatientLiveStatus(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<any> {
    return this.queuesService.getPatientLiveStatus(appointmentId, currentUser);
  }
}