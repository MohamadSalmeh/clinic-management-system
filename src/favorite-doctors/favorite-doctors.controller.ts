import {
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';


import { AuthRolesGuard, VerifiedGuard } from '../auth';
import { CurrentUser, Roles } from '../common/decorators';
import { FavoriteDoctorsService } from './favorite-doctors.service';
import { ActiveUserData, UserRole } from '../utils';



@UseGuards(AuthRolesGuard, VerifiedGuard)
@Roles(UserRole.PATIENT)
@Controller('favorite-doctors')
export class FavoriteDoctorsController {
    constructor(
        private readonly favoriteDoctorsService: FavoriteDoctorsService,
    ) { }

    @Post(':doctorId')
    addDoctorToFavorites(
        @CurrentUser() user: ActiveUserData,
        @Param('doctorId', ParseIntPipe) doctorId: number,
    ) {
        return this.favoriteDoctorsService.addDoctorToFavorites(
            user.sub,
            doctorId,
        );
    }

    @Delete(':doctorId')
    removeDoctorFromFavorites(
        @CurrentUser() user: ActiveUserData,
        @Param('doctorId', ParseIntPipe) doctorId: number,
    ) {
        return this.favoriteDoctorsService.removeDoctorFromFavorites(
            user.sub,
            doctorId,
        );
    }

    @Get()
    getMyFavoriteDoctors(
        @CurrentUser() user: ActiveUserData,
    ) {
        return this.favoriteDoctorsService.getMyFavoriteDoctors(
            user.sub,
        );
    }
}