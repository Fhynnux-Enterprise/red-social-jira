import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    // Ensure the global settings exist on startup
    const settings = await this.systemSettingRepository.findOne({ where: { id: 'global' } });
    if (!settings) {
      const newSettings = this.systemSettingRepository.create({
        id: 'global',
        isMaintenanceMode: false,
        minRequiredAppVersion: '1.0.0',
        maintenanceMessage: 'Estamos en mantenimiento programado. Volveremos pronto.',
      });
      await this.systemSettingRepository.save(newSettings);
    }
  }

  async getGlobalSettings(): Promise<SystemSetting> {
    return this.systemSettingRepository.findOneOrFail({ where: { id: 'global' } });
  }

  async updateGlobalSettings(
    isMaintenanceMode?: boolean,
    minRequiredAppVersion?: string,
    maintenanceMessage?: string,
    storeUrlIos?: string,
    storeUrlAndroid?: string,
  ): Promise<SystemSetting> {
    const settings = await this.getGlobalSettings();
    
    if (isMaintenanceMode !== undefined) settings.isMaintenanceMode = isMaintenanceMode;
    if (minRequiredAppVersion !== undefined) settings.minRequiredAppVersion = minRequiredAppVersion;
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;
    if (storeUrlIos !== undefined) settings.storeUrlIos = storeUrlIos;
    if (storeUrlAndroid !== undefined) settings.storeUrlAndroid = storeUrlAndroid;

    return this.systemSettingRepository.save(settings);
  }
}
