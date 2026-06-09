import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemSettingsService } from './system-settings.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@Resolver(() => SystemSetting)
export class SystemSettingsResolver {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Query(() => SystemSetting, { name: 'getSystemConfig' })
  async getSystemConfig(): Promise<SystemSetting> {
    return this.systemSettingsService.getGlobalSettings();
  }

  @Mutation(() => SystemSetting)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateSystemConfig(
    @Args('isMaintenanceMode', { type: () => Boolean, nullable: true }) isMaintenanceMode?: boolean,
    @Args('minRequiredAppVersion', { type: () => String, nullable: true }) minRequiredAppVersion?: string,
    @Args('maintenanceMessage', { type: () => String, nullable: true }) maintenanceMessage?: string,
    @Args('storeUrlIos', { type: () => String, nullable: true }) storeUrlIos?: string,
    @Args('storeUrlAndroid', { type: () => String, nullable: true }) storeUrlAndroid?: string,
  ): Promise<SystemSetting> {
    return this.systemSettingsService.updateGlobalSettings(
      isMaintenanceMode,
      minRequiredAppVersion,
      maintenanceMessage,
      storeUrlIos,
      storeUrlAndroid,
    );
  }
}
