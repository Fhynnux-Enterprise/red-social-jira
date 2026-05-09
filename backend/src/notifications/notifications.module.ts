import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';

@Module({
    imports: [TypeOrmModule.forFeature([Notification, DeviceToken])],
    providers: [NotificationsService, NotificationsResolver],
    exports: [NotificationsService],
})
export class NotificationsModule {}
