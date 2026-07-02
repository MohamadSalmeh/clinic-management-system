import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { ActiveUserData, CURRENT_USER_KEY, UserRole } from '../utils';
import { UpdateUserDto, UserIdParamDto } from './dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../file-storage/multer.config';
import { Response } from 'express';
type RequestWithCurrentUser = Request & {
  [CURRENT_USER_KEY]?: ActiveUserData;
};

@Controller('users')
@UseGuards(AuthRolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async findOne(@Param() params: UserIdParamDto): Promise<User> {
    return this.usersService.findOne(params.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  @UseGuards(VerifiedGuard)
  async update(
    @Param() params: UserIdParamDto,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() currentUser: ActiveUserData,
    @Req() request: Request,
  ): Promise<User> {
    const body = (request.body ?? {}) as Record<string, unknown>;

    if ('email' in body || 'phone' in body) {
      throw new BadRequestException('Email and phone cannot be updated');
    }

    return this.usersService.update(params.id, updateDto, currentUser);
  }
  @Patch('me/avatar')
  @Roles(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.ADMIN,
  )
  @UseInterceptors(FileInterceptor('file', multerConfig))
  updateAvatar(
    @UploadedFile()
    file: Express.Multer.File,

    @CurrentUser()
    currentUser: ActiveUserData,
  ) {
    return this.usersService.updateAvatar(
      currentUser.sub,
      file,
    );
  }
  @Delete('me/avatar')
  @Roles(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.ADMIN,
  )
  removeAvatar(
    @CurrentUser()
    currentUser: ActiveUserData,
  ) {
    return this.usersService.removeAvatar(
      currentUser.sub,
    );
  }
  @Get('me/avatar')
  @Roles(
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.ADMIN,
  )
  getMyAvatar(
    @CurrentUser()
    currentUser: ActiveUserData,

    @Res()
    response: Response,
  ) {
    return this.usersService.getMyAvatar(
      currentUser.sub,
      response,
    );
  }
}
