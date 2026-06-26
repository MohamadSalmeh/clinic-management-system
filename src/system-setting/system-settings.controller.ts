import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { AuthRolesGuard } from '../auth/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../utils';

import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { SystemSettingsService } from './system-settings.service';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  getSettings() {
    return this.systemSettingsService.getSettings();
  }
  //
  @Patch()
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  updateSettings(@Body() dto: UpdateSystemSettingDto) {
    return this.systemSettingsService.updateSettings(dto);
  }
}
