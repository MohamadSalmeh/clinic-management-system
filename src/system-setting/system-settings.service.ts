import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SystemSetting } from './entities/system-setting.entity';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';

@Injectable()
export class SystemSettingsService {

    constructor(
        @InjectRepository(SystemSetting)
        private readonly systemSettingsRepository: Repository<SystemSetting>,
    ) {}

    async getSettings(): Promise<SystemSetting> {

        let settings = await this.systemSettingsRepository.findOne({
            where: {
                id: 1,
            },
        });

        if (!settings) {

            settings = this.systemSettingsRepository.create({
                id: 1,
            });

            settings = await this.systemSettingsRepository.save(settings);
        }

        return settings;
    }

    async updateSettings(
        dto: UpdateSystemSettingDto,
    ): Promise<SystemSetting> {

        const settings = await this.getSettings();

        settings.cancelBeforeDays = dto.cancelBeforeDays;

        settings.lateCancelPenaltyPercent =
            dto.lateCancelPenaltyPercent.toString();

        settings.maxNoShowCount =
            dto.maxNoShowCount;

        settings.initialVisitDuration =
            dto.initialVisitDuration;

        settings.returnVisitDuration =
            dto.returnVisitDuration;

        return this.systemSettingsRepository.save(settings);
    }

}