import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationType } from './enums/notification.enums';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { pubSub } from '../common/pubsub';

@Injectable()
export class NotificationsService {
    private expo = new Expo();

    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        @InjectRepository(DeviceToken)
        private readonly deviceTokenRepository: Repository<DeviceToken>,
    ) {}

    async createNotification(userId: string, title: string, message: string, type: NotificationType, data?: string): Promise<Notification | null> {
        try {
            const notification = this.notificationRepository.create({
                userId,
                title,
                message,
                type,
                data,
            });
            const savedNotification = await this.notificationRepository.save(notification);
            pubSub.publish('NOTIFICATION_ADDED', { notificationAdded: savedNotification });
            return savedNotification;
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

    async registerPushToken(userId: string, cityId: string, token: string, platform?: string): Promise<boolean> {
        console.log(`[NotificationsService] Registrando token para usuario: ${userId} en ciudad: ${cityId}`);
        try {
            if (!Expo.isExpoPushToken(token)) {
                console.error(`Push token ${token} is not a valid Expo push token`);
                return false;
            }

            let deviceToken = await this.deviceTokenRepository.findOne({ where: { token } });

            if (deviceToken) {
                console.log(`[NotificationsService] El token ya existía. Actualizando userId y cityId...`);
                // Si el token existe pero es de otro usuario (ej. alguien prestó su teléfono), actualizamos el userId
                if (deviceToken.userId !== userId) {
                    deviceToken.userId = userId;
                }
                deviceToken.lastUsedAt = new Date();
                deviceToken.cityId = cityId; // Update cityId in case user moved
                await this.deviceTokenRepository.save(deviceToken);
            } else {
                console.log(`[NotificationsService] Creando nuevo registro de token.`);
                deviceToken = this.deviceTokenRepository.create({
                    token,
                    userId,
                    cityId,
                    platform,
                });
                await this.deviceTokenRepository.save(deviceToken);
            }
            console.log(`[NotificationsService] Token registrado con éxito.`);
            return true;
        } catch (error) {
            console.error('[NotificationsService] Error registering push token:', error);
            return false;
        }
    }

    async sendPushNotification(
        userId: string, 
        title: string, 
        body: string, 
        data?: any,
        options?: { categoryId?: string; tag?: string; threadId?: string }
    ): Promise<boolean> {
        console.log(`[NotificationsService] Intentando enviar notificación al usuario: ${userId}`);
        try {
            const deviceTokens = await this.deviceTokenRepository.find({ where: { userId } });
            console.log(`[NotificationsService] Se encontraron ${deviceTokens.length} tokens para este usuario.`);
            
            if (!deviceTokens || deviceTokens.length === 0) {
                return false;
            }

            const messages: ExpoPushMessage[] = [];
            for (const dt of deviceTokens) {
                if (!Expo.isExpoPushToken(dt.token)) {
                    console.error(`Push token ${dt.token} is not a valid Expo push token`);
                    continue;
                }
                const messageObj: any = {
                    to: dt.token,
                    sound: 'default',
                    title,
                    body,
                    data: data || {},
                    categoryId: options?.categoryId,
                    tag: options?.tag,
                    collapseId: options?.tag,
                };
                if (options?.threadId) {
                    messageObj.threadId = options?.threadId;
                }
                messages.push(messageObj);
            }

            const chunks = this.expo.chunkPushNotifications(messages);
            const tickets: ExpoPushTicket[] = [];

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                    console.log('[NotificationsService] Respuesta de Expo:', JSON.stringify(ticketChunk, null, 2));
                    tickets.push(...ticketChunk);
                } catch (error) {
                    console.error('Error sending push notification chunk:', error);
                }
            }
            return true;
        } catch (error) {
            console.error('[NotificationsService] Error sending push notification:', error);
            return false;
        }
    }
}
