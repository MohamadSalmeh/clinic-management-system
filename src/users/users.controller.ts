import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthRolesGuard } from '../auth/guards';
import { ActiveUserData, CURRENT_USER_KEY, UserRole } from '../utils';
import { UpdateUserDto, UserIdParamDto } from './dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

type RequestWithCurrentUser = Request & {
  [CURRENT_USER_KEY]?: ActiveUserData;
};

@Controller('users')
@UseGuards(AuthRolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  async update(
    @Param() params: UserIdParamDto,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<User> {
    return this.usersService.update(params.id, updateDto, currentUser);
  }
}
