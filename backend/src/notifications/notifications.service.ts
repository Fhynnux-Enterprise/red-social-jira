import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification.enums';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
    ) {}

    async createNotification(userId: string, title: string, message: string, type: NotificationType): Promise<Notification | null> {
        try {
            const notification = this.notificationRepository.create({
                userId,
                title,
                message,
                type,
            });
            return await this.notificationRepository.save(notification);
        } catch (error) {
            console.error('[NotificationsService] Error creating notification:', error);
            // Non-blocking for the main flow
            return null;
        }
    }

    async getMyNotifications(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
        return this.notificationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationRepository.count({
            where: { userId, isRead: false },
        });
    }

    async markAsRead(userId: string, notificationId: string): Promise<Notification | null> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId, userId },
        });

        if (notification) {
            notification.isRead = true;
            return this.notificationRepository.save(notification);
        }
        return null;
    }
    
    async markAllAsRead(userId: string): Promise<boolean> {
        await this.notificationRepository.update(
            { userId, isRead: false },
            { isRead: true }
        );
        return true;
    }
}
