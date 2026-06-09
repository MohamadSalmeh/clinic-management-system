import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SystemSetting } from './entities/system-setting.entity';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { AuthModule } from '../auth';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SystemSetting,
        ]),AuthModule
    ],
    controllers: [
        SystemSettingsController,
    ],
    providers: [
        SystemSettingsService,
    ],
    exports: [
        SystemSettingsService,
    ],
})
export class SystemSettingsModule {}