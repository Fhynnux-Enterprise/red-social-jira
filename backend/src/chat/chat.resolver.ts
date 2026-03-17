import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatArgs, SendMessageArgs } from './dto/chat.args';

@Resolver(() => Conversation)
@UseGuards(GqlAuthGuard)
export class ChatResolver {
    constructor(
        private readonly chatService: ChatService,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
    ) { }

    @Query(() => [Conversation], { name: 'getUserConversations' })
    async getUserConversations(@CurrentUser() user: User) {
        return this.chatService.getUserConversations(user.id);
    }

    @Query(() => [Message], { name: 'getChatMessages' })
    async getChatMessages(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
    ) {
        // Validación de seguridad: Comprobar que el usuario es participante
        const conversations = await this.chatService.getUserConversations(user.id);
        const isParticipant = conversations.some(c => c.id_conversation === id_conversation);
        
        if (!isParticipant) {
            throw new Error('No tienes permiso para ver los mensajes de esta conversación');
        }

        return this.chatService.getMessagesByConversation(id_conversation);
    }

    @Query(() => Conversation, { name: 'getConversation', nullable: true })
    async getConversation(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
    ) {
        // Validación de seguridad
        const conversations = await this.chatService.getUserConversations(user.id);
        const isParticipant = conversations.some(c => c.id_conversation === id_conversation);

        if (!isParticipant) {
            throw new Error('No tienes permiso para ver esta conversación');
        }

        return this.chatService.getConversationById(id_conversation);
    }

    @Mutation(() => Conversation, { name: 'getOrCreateOneOnOneChat' })
    async getOrCreateOneOnOneChat(
        @CurrentUser() user: User,
        @Args() args: CreateChatArgs,
    ) {
        return this.chatService.getOrCreateOneOnOneChat(user.id, args.targetUserId);
    }

    @Mutation(() => Message, { name: 'sendMessage' })
    async sendMessage(
        @CurrentUser() user: User,
        @Args() args: SendMessageArgs,
    ) {
        return this.chatService.sendMessage(user.id, args.id_conversation, args.content);
    }

    @ResolveField(() => Message, { nullable: true })
    async lastMessage(@Parent() conversation: Conversation) {
        return this.messageRepository.findOne({
            where: { id_conversation: conversation.id_conversation },
            order: { createdAt: 'DESC' },
        });
    }
}
