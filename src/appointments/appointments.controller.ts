import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { AppointmentsService } from './index';
import type { AppointmentGroupedResponse } from './index';
import { CalculateAppointmentTimeDto } from './dto/calculate-appointment-time.dto';
import {
    AdminAppointmentQueryDto,
    AppointmentQueryDto,
    CancelAppointmentDto,
    CreateAppointmentDto,
    DoctorAppointmentQueryDto,
    // RescheduleAppointmentDto,
} from './dto';
import { Appointment } from './entities/appointment.entity';
import { WaitListDto } from './dto';
import { AvailableDaysDto } from './dto';

@Controller('appointments')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Post()
    @Roles(UserRole.PATIENT)
    createAppointment(
        @CurrentUser() currentUser: ActiveUserData,
        @Body() dto: CreateAppointmentDto,
    ): Promise<Appointment> {
        return this.appointmentsService.createAppointment(currentUser.sub, dto);
    }

    @Get('my/upcoming')
    @Roles(UserRole.PATIENT)
    getMyUpcomingAppointments(
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<Appointment[]> {
        return this.appointmentsService.getMyUpcomingAppointments(currentUser.sub);
    }

    @Get('my')
    @Roles(UserRole.PATIENT)
    getMyAppointments(
        @CurrentUser() currentUser: ActiveUserData,
        @Query() query: AppointmentQueryDto,
    ): Promise<Appointment[] | AppointmentGroupedResponse> {
        return this.appointmentsService.getMyAppointments(currentUser.sub, query);
    }

    @Get('doctor/me/upcoming')
    @Roles(UserRole.DOCTOR)
    getDoctorUpcomingAppointments(
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<Appointment[]> {
        return this.appointmentsService.getDoctorUpcomingAppointments(currentUser.sub);
    }

    @Get('doctor/me')
    @Roles(UserRole.DOCTOR)
    getDoctorAppointments(
        @CurrentUser() currentUser: ActiveUserData,
        @Query() query: DoctorAppointmentQueryDto,
    ): Promise<Appointment[]> {
        return this.appointmentsService.getDoctorAppointments(currentUser.sub, query);
    }

    @Get('admin')
    @Roles(UserRole.ADMIN)
    getAdminAppointments(
        @Query() query: AdminAppointmentQueryDto,
    ): Promise<Appointment[]> {
        return this.appointmentsService.getAdminAppointments(query);
    }

    @Get(':id')
    @Roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
    getAppointmentById(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<Appointment> {
        return this.appointmentsService.getAppointmentById(id, currentUser);
    }

    @Patch(':id/cancel')
    @Roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
    cancelAppointment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() currentUser: ActiveUserData,
        @Body() dto: CancelAppointmentDto,
    ): Promise<Appointment> {
        return this.appointmentsService.cancelAppointment(id, currentUser, dto);
    }

    @Patch(':id/complete')
    @Roles(UserRole.DOCTOR)
    completeAppointment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<Appointment> {
        return this.appointmentsService.completeAppointment(id, currentUser);
    }

    @Patch(':id/check-in')
    @Roles(UserRole.DOCTOR)
    checkInAppointment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<Appointment> {
        return this.appointmentsService.checkInAppointment(id, currentUser);
    }

    @Patch(':id/no-show')
    @Roles(UserRole.DOCTOR)
    noShowAppointment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<Appointment> {
        return this.appointmentsService.markNoShow(id, currentUser);
    }
    @Post('next-time')
    @Roles(UserRole.PATIENT)
    calculateNextTime(
        @Body() dto: CalculateAppointmentTimeDto,
    ) {
        return this.appointmentsService.calculateNextAvailableTime(dto);
    }

    /* @Patch(':id/reschedule')
     @Roles(UserRole.PATIENT, UserRole.DOCTOR)
     rescheduleAppointment(
         @Param('id', ParseIntPipe) id: number,
         @CurrentUser() currentUser: ActiveUserData,
         @Body() dto: RescheduleAppointmentDto,
     ): Promise<Appointment> {
         return this.appointmentsService.rescheduleAppointment(id, currentUser, dto);
     }*/
    @Post('wait-list')
    @Roles(UserRole.PATIENT)
    getWaitList(
        @Body() dto: WaitListDto,
    ) {
        return this.appointmentsService.getWaitList(dto);
    }
    @Post('available-days')
    @Roles(UserRole.PATIENT)
    getAvailableDays(
        @Body() dto: AvailableDaysDto,
    ) {
        return this.appointmentsService.getAvailableDays(dto);
    }
}
