import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { AuthRolesGuard } from '../auth/guards';
import { DoctorInvitationsService } from '../doctor-invitations/doctor-invitations.service';
import { CreateDoctorInvitationDto } from './dto';
import { AdminsService } from './admins.service';
import { DoctorInvitation } from '../doctor-invitations/entities/doctor-invitation.entity';

@Controller('admin')
@UseGuards(AuthRolesGuard)
@Roles(UserRole.ADMIN)
export class AdminsController {
    constructor(
        private readonly adminsService: AdminsService,
        private readonly doctorInvitationsService: DoctorInvitationsService,
    ) { }

    @Post('profile/init')
    async initAdminProfile(
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<{ message: string; profileId: number; created: boolean }> {
        const result = await this.adminsService.createAdminProfile(currentUser.sub);
        const message = result.created
            ? 'Admin profile created'
            : 'Admin profile already exists';

        return {
            message,
            profileId: result.profile.id,
            created: result.created,
        };
    }

    @Post('doctor-invitations')
    async createDoctorInvitation(
        @Body() dto: CreateDoctorInvitationDto,
        @CurrentUser() currentUser: ActiveUserData,
    ): Promise<{ message: string; invitationId: number; email: string }> {
        const adminProfile = await this.adminsService.getAdminProfileByUserId(
            currentUser.sub,
        );
        const invitation = await this.doctorInvitationsService.createInvitation(
            dto.email,
            adminProfile.id,
        );

        return {
            message: 'Invitation created',
            invitationId: invitation.id,
            email: invitation.email,
        };
    }

    @Get('doctor-invitations')
    async listDoctorInvitations(): Promise<DoctorInvitation[]> {
        return this.doctorInvitationsService.listInvitations();
    }

    @Post('doctor-invitations/:id/cancel')
    async cancelDoctorInvitation(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<{ message: string }> {
        await this.doctorInvitationsService.cancelInvitation(id);

        return { message: 'Invitation cancelled' };
    }
}
