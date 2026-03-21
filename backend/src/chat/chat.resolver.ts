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
        const isParticipant = await this.chatService.isUserParticipant(id_conversation, user.id);
        
        if (!isParticipant) {
            throw new Error('No tienes permiso para ver los mensajes de esta conversación');
        }

        return this.chatService.getMessagesByConversation(id_conversation, user.id);
    }

    @Query(() => [Message], { name: 'searchMessagesInChat' })
    @UseGuards(GqlAuthGuard)
    async searchMessagesInChat(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
        @Args('searchTerm') searchTerm: string,
    ) {
        return this.chatService.searchMessagesInConversation(id_conversation, user.id, searchTerm);
    }

    @Mutation(() => Boolean)
    async deleteMessageForMe(
        @CurrentUser() user: User,
        @Args('id_message') id_message: string,
    ) {
        return this.chatService.deleteMessageForMe(id_message, user.id);
    }

    @Mutation(() => Boolean)
    async deleteMessageForAll(
        @CurrentUser() user: User,
        @Args('id_message') id_message: string,
    ) {
        return this.chatService.deleteMessageForAll(id_message, user.id);
    }

    @Mutation(() => Boolean)
    async deleteConversationForMe(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
    ) {
        return this.chatService.deleteConversationForMe(id_conversation, user.id);
    }

    @Mutation(() => Message)
    async editMessage(
        @CurrentUser() user: User,
        @Args('id_message') id_message: string,
        @Args('newContent') newContent: string,
    ) {
        return this.chatService.editMessage(id_message, user.id, newContent);
    }

    @Query(() => Conversation, { name: 'getConversation', nullable: true })
    async getConversation(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
    ) {
        // Validación de seguridad
        const isParticipant = await this.chatService.isUserParticipant(id_conversation, user.id);

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
    async lastMessage(
        @Parent() conversation: Conversation,
        @CurrentUser() user: User,
    ) {
        return this.messageRepository.createQueryBuilder('message')
            .where('message.id_conversation = :id_conversation', { id_conversation: conversation.id_conversation })
            .andWhere('(message.deletedFor IS NULL OR NOT (:userId = ANY (message.deletedFor)))', { userId: user.id })
            .orderBy('message.createdAt', 'DESC')
            .getOne();
    }
}
