import { Injectable, NotFoundException } from '@nestjs/common';
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
      where: { id: 1 },
    });

    if (!settings) {
      settings = this.systemSettingsRepository.create({ id: 1 });
      settings = await this.systemSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(dto: UpdateSystemSettingDto): Promise<SystemSetting> {
    const settings = await this.getSettings();

    // تحديث الحقول الموجودة
    if (dto.cancelBeforeDays !== undefined) {
      settings.cancelBeforeDays = dto.cancelBeforeDays;
    }

    if (dto.lateCancelPenaltyPercent !== undefined) {
      settings.lateCancelPenaltyPercent =
        dto.lateCancelPenaltyPercent.toString();
    }

    if (dto.maxNoShowCount !== undefined) {
      settings.maxNoShowCount = dto.maxNoShowCount;
    }

    if (dto.initialVisitDuration !== undefined) {
      settings.initialVisitDuration = dto.initialVisitDuration;
    }

    if (dto.returnVisitDuration !== undefined) {
      settings.returnVisitDuration = dto.returnVisitDuration;
    }

    if (dto.consultationDuration !== undefined) {
      settings.consultationDuration = dto.consultationDuration;
    }

    if (dto.followUpDuration !== undefined) {
      settings.followUpDuration = dto.followUpDuration;
    }

    if (dto.operationDuration !== undefined) {
      settings.operationDuration = dto.operationDuration;
    }

    if (dto.defaultDuration !== undefined) {
      settings.defaultDuration = dto.defaultDuration;
    }

    if (dto.checkinBeforeHours !== undefined) {
    settings.checkinBeforeHours = dto.checkinBeforeHours;
  }

    return this.systemSettingsRepository.save(settings);
  }

  async getDurationByAppointmentType(type: string): Promise<number> {
    const settings = await this.getSettings();

    switch (type) {
      case 'consultation':
        return settings.consultationDuration;
      case 'follow_up':
        return settings.followUpDuration;
      case 'operation':
        return settings.operationDuration;
      default:
        return settings.defaultDuration;
    }
  }
}
