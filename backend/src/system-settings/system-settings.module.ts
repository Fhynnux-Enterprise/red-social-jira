import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsResolver } from './system-settings.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [SystemSettingsService, SystemSettingsResolver],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
