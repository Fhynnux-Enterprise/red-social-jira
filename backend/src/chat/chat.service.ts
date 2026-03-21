import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { Message } from './entities/message.entity';
import { User } from '../auth/entities/user.entity';

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
    ) { }

    async getOrCreateOneOnOneChat(currentUserId: string, targetUserId: string): Promise<Conversation> {
        if (currentUserId === targetUserId) {
            throw new BadRequestException('No puedes crear un chat contigo mismo');
        }

        // 1. Buscar si ya existe la conversación entre ambos (y que sea solo de 2 personas)
        const existingConversation = await this.conversationRepository
            .createQueryBuilder('conversation')
            .innerJoin('conversation.participants', 'p1')
            .innerJoin('conversation.participants', 'p2')
            .where('p1.id_user = :currentUserId', { currentUserId })
            .andWhere('p2.id_user = :targetUserId', { targetUserId })
            .andWhere((qb) => {
                const subQuery = qb.subQuery()
                    .select('COUNT(*)')
                    .from(Participant, 'p')
                    .where('p.id_conversation = conversation.id_conversation')
                    .getQuery();
                return subQuery + ' = 2';
            })
            .getOne();

        if (existingConversation) {
            return existingConversation;
        }

        // 2. Si no existe, crearla
        const newConversation = this.conversationRepository.create();
        const savedConversation = await this.conversationRepository.save(newConversation);

        // 3. Crear los participantes
        const p1 = this.participantRepository.create({
            id_user: currentUserId,
            id_conversation: savedConversation.id_conversation,
        });
        const p2 = this.participantRepository.create({
            id_user: targetUserId,
            id_conversation: savedConversation.id_conversation,
        });

        await this.participantRepository.save([p1, p2]);

        return savedConversation;
    }

    async sendMessage(senderId: string, id_conversation: string, content: string): Promise<Message> {
        const conversation = await this.conversationRepository.findOne({
            where: { id_conversation },
            relations: ['participants']
        });

        if (!conversation) {
            throw new NotFoundException('Conversación no encontrada');
        }

        // Verificar que el remitente sea parte de la conversación
        const isParticipant = conversation.participants.some(p => p.id_user === senderId);
        if (!isParticipant) {
            throw new BadRequestException('No eres parte de esta conversación');
        }

        const newMessage = this.messageRepository.create({
            content,
            id_conversation,
            id_user: senderId,
            isRead: false,
        });

        const savedMessage = await this.messageRepository.save(newMessage);

        // Actualizar updatedAt de la conversación
        conversation.updatedAt = new Date();
        await this.conversationRepository.save(conversation);

        // Retornamos el mensaje cargando la relación 'sender' para cumplir con el esquema GraphQL
        return this.messageRepository.findOneOrFail({
            where: { id_message: savedMessage.id_message },
            relations: ['sender']
        });
    }

    async getUserConversations(userId: string): Promise<Conversation[]> {
        const participations = await this.participantRepository.find({
            where: { id_user: userId },
            select: ['id_conversation'],
        });

        const conversationIds = participations.map(p => p.id_conversation);

        if (conversationIds.length === 0) return [];

        // Recuperamos conversaciones que tengan al menos un mensaje NO borrado para este usuario
        const conversations = await this.conversationRepository.createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participant')
            .leftJoinAndSelect('participant.user', 'user')
            // Join con mensajes para filtrar los que sí tiene visibles
            .innerJoin('conversation.messages', 'message')
            .where('conversation.id_conversation IN (:...conversationIds)', { conversationIds })
            .andWhere('(message.deletedFor IS NULL OR NOT (:userId = ANY (message.deletedFor)))', { userId })
            .orderBy('conversation.updatedAt', 'DESC')
            .getMany();

        return conversations;
    }

    async getMessagesByConversation(id_conversation: string, currentUserId: string): Promise<Message[]> {
        return this.messageRepository.createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .where('message.id_conversation = :id_conversation', { id_conversation })
            .andWhere('(message.deletedFor IS NULL OR NOT (:currentUserId = ANY (message.deletedFor)))', { currentUserId })
            .orderBy('message.createdAt', 'ASC')
            .getMany();
    }

    async isUserParticipant(id_conversation: string, userId: string): Promise<boolean> {
        const participant = await this.participantRepository.findOne({
            where: { id_conversation, id_user: userId }
        });
        return !!participant;
    }

    async deleteMessageForMe(id_message: string, currentUserId: string): Promise<boolean> {
        const message = await this.messageRepository.findOne({
            where: { id_message }
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

    async deleteConversationForMe(id_conversation: string, currentUserId: string): Promise<boolean> {
        await this.messageRepository.createQueryBuilder()
            .update(Message)
            .set({
                // Usamos array_append de PostgreSQL 
                deletedFor: () => `array_append(COALESCE("deletedFor", '{}'), '${currentUserId}')`
            })
            .where('id_conversation = :id_conversation', { id_conversation })
            .andWhere('(deletedFor IS NULL OR NOT (:currentUserId = ANY(deletedFor)))', { currentUserId })
            .execute();

        return true;
    }

    async deleteMessageForAll(id_message: string, currentUserId: string): Promise<boolean> {
        const message = await this.messageRepository.findOne({
            where: { id_message },
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
        await this.messageRepository.save(message);

        return true;
    }

    async editMessage(id_message: string, currentUserId: string, newContent: string): Promise<Message> {
        const message = await this.messageRepository.findOne({
            where: { id_message },
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

    async getConversationById(id_conversation: string): Promise<Conversation | null> {
        return this.conversationRepository.findOne({
            where: { id_conversation },
            relations: ['participants', 'participants.user', 'participants.user.badge'],
        });
    }

    async searchMessagesInConversation(
        id_conversation: string,
        currentUserId: string,
        searchTerm: string,
    ): Promise<Message[]> {
        if (!searchTerm) return [];

        return this.messageRepository.createQueryBuilder('message')
            .where('message.id_conversation = :id_conversation', { id_conversation })
            .andWhere('message.content ILIKE :term', { term: `%${searchTerm}%` })
            .andWhere('message.isDeletedForAll = false')
            .andWhere('(message.deletedFor IS NULL OR NOT (:currentUserId = ANY (message.deletedFor)))', { currentUserId })
            .orderBy('message.createdAt', 'DESC')
            .getMany();
    }
}
