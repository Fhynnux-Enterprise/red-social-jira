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

        return savedMessage;
    }

    async getUserConversations(userId: string): Promise<Conversation[]> {
        const participations = await this.participantRepository.find({
            where: { id_user: userId },
            select: ['id_conversation'],
        });

        const conversationIds = participations.map(p => p.id_conversation);

        if (conversationIds.length === 0) return [];

        return this.conversationRepository.find({
            where: { id_conversation: In(conversationIds) },
            relations: ['participants', 'participants.user'],
            order: { updatedAt: 'DESC' },
        });
    }

    async getMessagesByConversation(id_conversation: string): Promise<Message[]> {
        return this.messageRepository.find({
            where: { id_conversation },
            relations: ['sender'],
            order: { createdAt: 'ASC' },
        });
    }
}
