import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { Message } from './entities/message.entity';
import { User } from '../auth/entities/user.entity';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectRepository(Participant)
        private participantRepository: Repository<Participant>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private userBlocksService: UserBlocksService,
        private readonly notificationsService: NotificationsService,
    ) { }

    async getOrCreateOneOnOneChat(currentUserId: string, targetUserId: string): Promise<Conversation> {
        const isSelfChat = currentUserId === targetUserId;

        if (!isSelfChat) {
            const isBlocked = await this.userBlocksService.checkIfBlocked(currentUserId, targetUserId);
            if (isBlocked) {
                throw new ForbiddenException({
                    code: 'CHAT_BLOCKED',
                    message: 'No puedes comunicarte con este usuario.',
                });
            }
        }

        // 1. Buscar si ya existe la conversación entre ambos (o consigo mismo)
        let existingQuery = this.conversationRepository
            .createQueryBuilder('conversation')
            .innerJoin('conversation.participants', 'p1')
            .where('p1.userId = :currentUserId', { currentUserId });

        if (isSelfChat) {
            existingQuery = existingQuery.andWhere((qb) => {
                const subQuery = qb.subQuery()
                    .select('COUNT(*)')
                    .from(Participant, 'p')
                    .where('p.conversationId = conversation.id')
                    .getQuery();
                // Self chat tiene solo 1 participante
                return subQuery + ' = 1';
            });
        } else {
            existingQuery = existingQuery
                .innerJoin('conversation.participants', 'p2')
                .andWhere('p2.userId = :targetUserId', { targetUserId })
                .andWhere((qb) => {
                    const subQuery = qb.subQuery()
                        .select('COUNT(*)')
                        .from(Participant, 'p')
                        .where('p.conversationId = conversation.id')
                        .getQuery();
                    return subQuery + ' = 2';
                });
        }

        const existingConversation = await existingQuery.getOne();

        if (existingConversation) {
            return existingConversation;
        }

        // 2. Si no existe, crearla
        const newConversation = this.conversationRepository.create();
        const savedConversation = await this.conversationRepository.save(newConversation);

        // 3. Crear los participantes
        const participantsToSave: Participant[] = [];
        
        const p1 = this.participantRepository.create({
            userId: currentUserId,
            conversationId: savedConversation.id,
        });
        participantsToSave.push(p1);

        if (!isSelfChat) {
            const p2 = this.participantRepository.create({
                userId: targetUserId,
                conversationId: savedConversation.id,
            });
            participantsToSave.push(p2);
        }

        await this.participantRepository.save(participantsToSave);

        return savedConversation;
    }

    async sendMessage(
        senderId: string, 
        conversationId: string, 
        content: string, 
        imageUrl?: string, 
        videoUrl?: string, 
        storyId?: string, 
        audioUrl?: string, 
        audioDuration?: number,
        fileUrl?: string,
        fileName?: string,
        fileSize?: number,
        fileMimeType?: string
    ): Promise<Message> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participants']
        });

        if (!conversation) {
            throw new NotFoundException('Conversación no encontrada');
        }

        // Verificar que el remitente sea parte de la conversación
        const isParticipant = conversation.participants.some(p => p.userId === senderId);
        if (!isParticipant) {
            throw new BadRequestException('No eres parte de esta conversación');
        }

        // Si es un chat 1:1, verificar bloqueos
        if (conversation.participants.length === 2) {
            const otherParticipant = conversation.participants.find(p => p.userId !== senderId);
            if (otherParticipant) {
                const isBlocked = await this.userBlocksService.checkIfBlocked(senderId, otherParticipant.userId);
                if (isBlocked) {
                    throw new ForbiddenException({
                        code: 'CHAT_BLOCKED',
                        message: 'No puedes comunicarte con este usuario.',
                    });
                }
            }
        }

        // Validación: El mensaje debe tener contenido o algún tipo de media
        if (!content && !imageUrl && !videoUrl && !storyId && !audioUrl && !fileUrl) {
            throw new BadRequestException('El mensaje no puede estar vacío');
        }

        const newMessage = this.messageRepository.create({
            content: content || '',
            imageUrl: imageUrl || undefined,
            videoUrl: videoUrl || undefined,
            storyId: storyId || undefined,
            audioUrl: audioUrl || undefined,
            audioDuration: audioDuration || undefined,
            fileUrl: fileUrl || undefined,
            fileName: fileName || undefined,
            fileSize: fileSize || undefined,
            fileMimeType: fileMimeType || undefined,
            conversationId,
            userId: senderId,
            isRead: false,
        });

        const savedMessage = await this.messageRepository.save(newMessage);

        // Actualizar updatedAt de la conversación
        conversation.updatedAt = new Date();
        await this.conversationRepository.save(conversation);

        // Send notifications asynchronously in a non-blocking way
        (async () => {
            try {
                const sender = await this.userRepository.findOne({ where: { id: senderId } });
                const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'Un usuario';

                const bodyText = content || 'Te envió un archivo multimedia';

                const payload = {
                    type: 'CHAT_ROOM',
                    conversationId,
                    senderId,
                    senderAvatar: sender?.photoUrl || null,
                    senderName,
                };

                // Notify other participants
                const otherParticipants = conversation.participants.filter(p => p.userId !== senderId);
                for (const participant of otherParticipants) {
                    let participantTitle = senderName;

                    try {
                        // Contamos los mensajes no leídos del hilo que no haya enviado el destinatario
                        const unreadCount = await this.messageRepository.createQueryBuilder('message')
                            .where('message.conversationId = :conversationId', { conversationId })
                            .andWhere('message.userId != :recipientId', { recipientId: participant.userId })
                            .andWhere('message.isRead = false')
                            .getCount();

                        if (unreadCount <= 1) {
                            participantTitle = `${senderName} te envió 1 mensaje`;
                        } else if (unreadCount > 99) {
                            participantTitle = `${senderName} te envió +99 mensajes`;
                        } else {
                            participantTitle = `${senderName} te envió ${unreadCount} mensajes`;
                        }
                    } catch (dbErr) {
                        console.error('[ChatService] Error counting unread messages for notification title:', dbErr);
                    }

                    // Send push notification
                    this.notificationsService.sendPushNotification(
                        participant.userId,
                        participantTitle,
                        bodyText,
                        payload,
                        {
                            categoryId: 'chat-message',
                            threadId: conversationId,
                        }
                    ).catch(err => {
                        console.error('[ChatService] Error sending push notification:', err);
                    });
                }
            } catch (err) {
                console.error('[ChatService] Error handling push notifications:', err);
            }
        })();

        // Retornamos el mensaje cargando la relación 'sender' para cumplir con el esquema GraphQL
        return this.messageRepository.findOneOrFail({
            where: { id: savedMessage.id },
            relations: ['sender']
        });
    }

    async getUserConversations(userId: string): Promise<Conversation[]> {
        const participations = await this.participantRepository.find({
            where: { userId },
            select: ['conversationId'],
        });

        const conversationIds = participations.map(p => p.conversationId);

        if (conversationIds.length === 0) return [];

        // Recuperamos conversaciones que tengan al menos un mensaje NO borrado para este usuario
        const conversations = await this.conversationRepository.createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participant')
            .leftJoinAndSelect('participant.user', 'user')
            // Join con mensajes para filtrar los que sí tiene visibles
            .innerJoin('conversation.messages', 'message')
            .where('conversation.id IN (:...conversationIds)', { conversationIds })
            .andWhere('(message.deletedFor IS NULL OR NOT (:userId = ANY (message.deletedFor)))', { userId })
            .orderBy('conversation.updatedAt', 'DESC')
            .getMany();

        return conversations;
    }

    async getMessagesByConversation(conversationId: string, currentUserId: string, limit = 20, offset = 0): Promise<Message[]> {
        return this.messageRepository.createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .where('message.conversationId = :conversationId', { conversationId })
            .andWhere('(message.deletedFor IS NULL OR NOT (:currentUserId = ANY (message.deletedFor)))', { currentUserId })
            .orderBy('message.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();
    }

    async isUserParticipant(conversationId: string, userId: string): Promise<boolean> {
        const participant = await this.participantRepository.findOne({
            where: { conversationId, userId }
        });
        return !!participant;
    }

    async deleteMessageForMe(messageId: string, currentUserId: string): Promise<boolean> {
        const message = await this.messageRepository.findOne({
            where: { id: messageId }
        });

        if (!message) {
            throw new NotFoundException('Mensaje no encontrado');
        }

        const currentDeletedFor = message.deletedFor || [];

        if (!currentDeletedFor.includes(currentUserId)) {
            message.deletedFor = [...currentDeletedFor, currentUserId];
            await this.messageRepository.save(message);
        }

        return true;
    }

    async deleteConversationForMe(conversationId: string, currentUserId: string): Promise<boolean> {
        await this.messageRepository.createQueryBuilder()
            .update(Message)
            .set({
                // Usamos array_append de PostgreSQL 
                deletedFor: () => `array_append(COALESCE("deleted_for", '{}'), '${currentUserId}')`
            })
            .where('conversation_id = :conversationId', { conversationId })
            .andWhere('(deleted_for IS NULL OR NOT (:currentUserId = ANY(deleted_for)))', { currentUserId })
            .execute();

        return true;
    }

    async deleteMessageForAll(messageId: string, currentUserId: string): Promise<Message> {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
            relations: ['sender']
        });

        if (!message) {
            throw new NotFoundException('Mensaje no encontrado');
        }

        if (message.sender.id !== currentUserId) {
            throw new BadRequestException('Solo puedes eliminar tus propios mensajes para todos');
        }

        message.isDeletedForAll = true;
        message.content = ""; // Vaciamos el contenido original por privacidad
        // También borramos referencias a archivos/imágenes si existen
        (message as any).imageUrl = null;
        (message as any).videoUrl = null;
        (message as any).audioUrl = null;
        (message as any).fileUrl = null;
        
        return this.messageRepository.save(message);
    }

    async deleteMessagesBulk(messageIds: string[], currentUserId: string): Promise<Message[]> {
        const messages = await this.messageRepository.find({
            where: { id: In(messageIds) },
            relations: ['sender']
        });

        const messagesToSave: Message[] = [];

        for (const message of messages) {
            if (message.sender.id === currentUserId) {
                message.isDeletedForAll = true;
                message.content = "";
                (message as any).imageUrl = null;
                (message as any).videoUrl = null;
                (message as any).audioUrl = null;
                (message as any).fileUrl = null;
                messagesToSave.push(message);
            }
        }

        if (messagesToSave.length > 0) {
            return this.messageRepository.save(messagesToSave);
        }
        return [];
    }

    async deleteMessagesBulkForMe(messageIds: string[], currentUserId: string): Promise<Message[]> {
        const messages = await this.messageRepository.find({
            where: { id: In(messageIds) },
            relations: ['sender']
        });

        const messagesToSave: Message[] = [];

        for (const message of messages) {
            const currentDeletedFor = message.deletedFor || [];
            if (!currentDeletedFor.includes(currentUserId)) {
                message.deletedFor = [...currentDeletedFor, currentUserId];
                messagesToSave.push(message);
            }
        }

        if (messagesToSave.length > 0) {
            return this.messageRepository.save(messagesToSave);
        }
        
        return [];
    }

    async editMessage(messageId: string, currentUserId: string, newContent: string): Promise<Message> {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
            relations: ['sender']
        });

        if (!message) {
            throw new NotFoundException('Mensaje no encontrado');
        }

        if (message.sender.id !== currentUserId) {
            throw new BadRequestException('Solo puedes editar tus propios mensajes');
        }

        if (message.isDeletedForAll) {
            throw new BadRequestException('No puedes editar un mensaje que ha sido eliminado');
        }

        message.content = newContent;
        message.editedAt = new Date();
        return this.messageRepository.save(message);
    }

    async getConversationById(conversationId: string): Promise<Conversation | null> {
        return this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participants', 'participants.user', 'participants.user.badge'],
        });
    }

    async searchMessagesInConversation(
        conversationId: string,
        currentUserId: string,
        searchTerm: string,
    ): Promise<Message[]> {
        if (!searchTerm) return [];

        return this.messageRepository.createQueryBuilder('message')
            .where('message.conversationId = :conversationId', { conversationId })
            .andWhere('message.content ILIKE :term', { term: `%${searchTerm}%` })
            .andWhere('message.isDeletedForAll = false')
            .andWhere('(message.deletedFor IS NULL OR NOT (:currentUserId = ANY (message.deletedFor)))', { currentUserId })
            .orderBy('message.createdAt', 'DESC')
            .getMany();
    }

    async markMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
        // Marcamos como leídos todos los mensajes de la conversación que no fueron enviados por el usuario actual
        // y que aún no están marcados como leídos.
        await this.messageRepository.createQueryBuilder()
            .update(Message)
            .set({ 
                isRead: true,
                readAt: new Date()
            })
            .where('conversation_id = :conversationId', { conversationId })
            .andWhere('user_id != :userId', { userId })
            .andWhere('is_read = false')
            .execute();

        // Buscamos el último mensaje para guardarlo como referencia en el participante
        const lastMessage = await this.messageRepository.findOne({
            where: { conversationId },
            order: { createdAt: 'DESC' }
        });

        if (lastMessage) {
            await this.participantRepository.update(
                { conversationId, userId },
                { lastReadMessageId: lastMessage.id }
            );
        }

        return true;
    }

    async getChatMedia(conversationId: string, currentUserId: string, limit = 20, offset = 0): Promise<Message[]> {
        return this.messageRepository.createQueryBuilder('message')
            .where('message.conversationId = :conversationId', { conversationId })
            .andWhere('(message.imageUrl IS NOT NULL OR message.videoUrl IS NOT NULL)')
            .andWhere('message.isDeletedForAll = false')
            .andWhere('(message.deletedFor IS NULL OR NOT (:currentUserId = ANY (message.deletedFor)))', { currentUserId })
            .orderBy('message.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();
    }
}
