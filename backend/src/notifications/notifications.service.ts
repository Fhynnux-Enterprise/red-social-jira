import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { User } from '../auth/entities/user.entity';
import { NotificationType } from './enums/notification.enums';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { pubSub } from '../common/pubsub';

@Injectable()
export class NotificationsService {
    private expo = new Expo();

    private resolveUrl(url?: string | null): string | undefined {
        if (!url) return undefined;
        if (url.startsWith('http') || url.startsWith('file://')) return url;
        const serverUrl = process.env.SERVER_URL || 'https://canton-enterprise-production.up.railway.app';
        return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    private getOptimizedImageUrl(url?: string | null, width = 1000): string | undefined {
        const resolved = this.resolveUrl(url);
        if (!resolved) return undefined;
        if (!resolved.startsWith('http') || resolved.includes('localhost') || resolved.includes('127.0.0.1')) {
            return resolved;
        }
        return `https://wsrv.nl/?url=${encodeURIComponent(resolved)}&w=${width}&q=85&output=jpg`;
    }

    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        @InjectRepository(DeviceToken)
        private readonly deviceTokenRepository: Repository<DeviceToken>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
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

            const isChat = options?.categoryId === 'chat-message';
            const messages: ExpoPushMessage[] = [];
            for (const dt of deviceTokens) {
                if (!Expo.isExpoPushToken(dt.token)) {
                    console.error(`Push token ${dt.token} is not a valid Expo push token`);
                    continue;
                }
                const messageObj: any = {
                    to: dt.token,
                    data: {
                        ...(data || {}),
                    },
                    categoryId: options?.categoryId,
                };
                if (isChat) {
                    messageObj.title = title;
                    messageObj.body = body;
                    messageObj.sound = 'default';
                    messageObj.priority = 'high';
                    messageObj._contentAvailable = true;
                    messageObj.data.title = title;
                    messageObj.data.body = body;
                    
                    // Colapsar/agrupar mensajes de la misma conversación
                    if (options?.threadId) {
                        messageObj.tag = options.threadId;
                        messageObj.collapseId = options.threadId;
                    }
                } else {
                    messageObj.title = title;
                    messageObj.body = body;
                    messageObj.sound = 'default';
                    messageObj.priority = 'high';
                    messageObj._contentAvailable = true;
                    messageObj.tag = options?.tag;
                    messageObj.collapseId = options?.tag;

                    // Separar imagen del post/producto del avatar del remitente
                    // data.image  → primera imagen del producto/post (BigPicture en Notifee)
                    // data.authorAvatarUrl / data.senderAvatar → avatar del remitente (largeIcon)
                    const postImageUrl = this.getOptimizedImageUrl(data?.image ?? null, 1000);
                    const avatarUrl = this.getOptimizedImageUrl(data?.authorAvatarUrl || data?.senderAvatar, 150);

                    // Siempre propagar ambos campos resueltos al data payload
                    // para que el background task (Notifee) los consuma correctamente
                    if (postImageUrl && !messageObj.data.image) {
                        messageObj.data.image = postImageUrl;
                    }
                    if (avatarUrl && !messageObj.data.authorAvatarUrl) {
                        messageObj.data.authorAvatarUrl = avatarUrl;
                    }
                    if (avatarUrl && !messageObj.data.senderAvatar) {
                        messageObj.data.senderAvatar = avatarUrl;
                    }

                    // richContent.image → imagen del producto (la que muestra el OS nativamente)
                    if (postImageUrl) {
                        messageObj.mutableContent = true;
                        messageObj.richContent = {
                            image: postImageUrl,
                        };
                    }
                }
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

    async sendGlobalNotification(
        title: string,
        body: string,
        cityId: string | null,
        saveInDb: boolean,
        imageUrl?: string | null,
        detailed?: boolean,
        badgeText?: string | null,
        postId?: string | null,
        postType?: string | null,
        authorAvatarUrl?: string | null,
    ): Promise<boolean> {
        console.log(`[NotificationsService] Enviando notificación global: "${title}" - Ciudad: ${cityId || 'Todas'} - Guardar DB: ${saveInDb} - Imagen: ${imageUrl || 'Ninguna'} - Detallada: ${detailed} - Badge: ${badgeText} - PostId: ${postId} - PostType: ${postType} - AuthorAvatarUrl: ${authorAvatarUrl}`);
        try {
            // 1. Obtener todos los tokens de dispositivos según el filtro de ciudad
            let query = this.deviceTokenRepository.createQueryBuilder('deviceToken');
            if (cityId && cityId !== 'all') {
                query = query.where('deviceToken.cityId = :cityId', { cityId });
            }
            const deviceTokens = await query.getMany();
            console.log(`[NotificationsService] Se encontraron ${deviceTokens.length} tokens para enviar.`);

            // 2. Si saveInDb es true, guardar la notificación en la DB de cada usuario
            if (saveInDb) {
                let userQuery = this.userRepository.createQueryBuilder('user');
                if (cityId && cityId !== 'all') {
                    userQuery = userQuery.where('user.cityId = :cityId', { cityId });
                }
                const users = await userQuery.select(['user.id']).getMany();
                console.log(`[NotificationsService] Creando alerta en DB para ${users.length} usuarios.`);

                const notificationsToSave = users.map(user => {
                    return this.notificationRepository.create({
                        userId: user.id,
                        title,
                        message: body,
                        type: NotificationType.SYSTEM,
                        isRead: false,
                        data: JSON.stringify({ 
                            image: imageUrl || undefined, 
                            detailed: detailed || false,
                            badgeText: badgeText || undefined,
                            postId: postId || undefined,
                            type: postType || undefined,
                            authorAvatarUrl: authorAvatarUrl || undefined,
                        }),
                    });
                });

                // Guardar en lotes de 500 para evitar desbordar SQL
                const chunkSize = 500;
                for (let i = 0; i < notificationsToSave.length; i += chunkSize) {
                    const chunk = notificationsToSave.slice(i, i + chunkSize);
                    await this.notificationRepository.save(chunk);
                }

                if (notificationsToSave.length > 0) {
                    pubSub.publish('NOTIFICATION_ADDED', { notificationAdded: notificationsToSave[0] });
                }
            }

            // 3. Enviar notificaciones push a través de Expo
            if (deviceTokens.length === 0) {
                return true;
            }

            const resolvedImageUrl = this.getOptimizedImageUrl(imageUrl, 1000);
            const resolvedAuthorAvatarUrl = this.getOptimizedImageUrl(authorAvatarUrl, 150);

            const messages: any[] = [];
            for (const dt of deviceTokens) {
                if (!Expo.isExpoPushToken(dt.token)) {
                    console.error(`Push token ${dt.token} is not a valid Expo push token`);
                    continue;
                }
                const msg: any = {
                    to: dt.token,
                    title,
                    body,
                    sound: 'default',
                    priority: 'high',
                    channelId: 'default',
                    data: {
                        type: postType || 'SYSTEM_ALERT',
                        postId: postId || undefined,
                        image: resolvedImageUrl || undefined,
                        detailed: (detailed && !postId) ? 'true' : 'false',
                        badgeText: badgeText || undefined,
                        authorAvatarUrl: resolvedAuthorAvatarUrl || undefined,
                    }
                };
                if (resolvedImageUrl || resolvedAuthorAvatarUrl) {
                    msg._contentAvailable = true;
                }
                if (resolvedImageUrl) {
                    msg.mutableContent = true;
                    msg.richContent = {
                        image: resolvedImageUrl,
                    };
                }
                messages.push(msg);
            }

            const chunks = this.expo.chunkPushNotifications(messages as ExpoPushMessage[]);
            for (const chunk of chunks) {
                try {
                    await this.expo.sendPushNotificationsAsync(chunk);
                } catch (error) {
                    console.error('Error sending push notification chunk:', error);
                }
            }

            return true;
        } catch (error) {
            console.error('[NotificationsService] Error in sendGlobalNotification:', error);
            return false;
        }
    }
}
