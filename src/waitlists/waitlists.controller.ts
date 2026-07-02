import { Body, Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { WaitlistService } from "./waitlists.service";
import { CurrentUser, Roles } from "../common/decorators";
import { ActiveUserData, UserRole } from "../utils";
import { CreateWaitlistDto } from "./dto/create-waitlist.dto";
import { AuthRolesGuard, VerifiedGuard } from "../auth";


@Controller('waitlists')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class WaitlistController {
    constructor(private readonly waitlistsService: WaitlistService) { }

    @Post('join')
    @Roles(UserRole.PATIENT)
    joinWaitlist(
        @CurrentUser() currentUser: ActiveUserData,
        @Body() dto: CreateWaitlistDto,
    ) {
        return this.waitlistsService.joinWaitlist(
            currentUser.sub,
            dto,
        );
    }
    @Delete('leave')
    @Roles(UserRole.PATIENT)
    leaveWaitlist(
        @CurrentUser() currentUser: ActiveUserData,
        @Body() dto: CreateWaitlistDto,
    ) {
        return this.waitlistsService.leaveWaitlist(
            currentUser.sub,
            dto,
        );
    }
}