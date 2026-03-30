import { Resolver, Query, Mutation, Args, ResolveField, Parent, Subscription, ObjectType, Field } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

const pubSub = new PubSub();
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CreateChatArgs, SendMessageArgs } from './dto/chat.args';

@ObjectType()
export class ReadMessagesPayload {
    @Field()
    id_conversation: string;

    @Field()
    readerId: string;
}

@Resolver(() => Conversation)
export class ChatResolver {
    constructor(
        private readonly chatService: ChatService,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
    ) { }

    @Query(() => [Conversation], { name: 'getUserConversations' })
    @UseGuards(GqlAuthGuard)
    async getUserConversations(@CurrentUser() user: User) {
        return this.chatService.getUserConversations(user.id);
    }

    @Query(() => [Message], { name: 'getChatMessages' })
    @UseGuards(GqlAuthGuard)
    async getChatMessages(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
        @Args('limit', { type: () => Number, nullable: true }) limit?: number,
        @Args('offset', { type: () => Number, nullable: true }) offset?: number,
    ) {
        // Validación de seguridad: Comprobar que el usuario es participante
        const isParticipant = await this.chatService.isUserParticipant(id_conversation, user.id);

        if (!isParticipant) {
            throw new Error('No tienes permiso para ver los mensajes de esta conversación');
        }

        return this.chatService.getMessagesByConversation(id_conversation, user.id, limit, offset);
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
    @UseGuards(GqlAuthGuard)
    async deleteMessageForMe(
        @CurrentUser() user: User,
        @Args('id_message') id_message: string,
    ) {
        return this.chatService.deleteMessageForMe(id_message, user.id);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async deleteMessageForAll(
        @CurrentUser() user: User,
        @Args('id_message') id_message: string,
    ) {
        return this.chatService.deleteMessageForAll(id_message, user.id);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async deleteConversationForMe(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
    ) {
        return this.chatService.deleteConversationForMe(id_conversation, user.id);
    }

    @Mutation(() => Message)
    @UseGuards(GqlAuthGuard)
    async editMessage(
        @CurrentUser() user: User,
        @Args('id_message') id_message: string,
        @Args('newContent') newContent: string,
    ) {
        return this.chatService.editMessage(id_message, user.id, newContent);
    }

    @Query(() => Conversation, { name: 'getConversation', nullable: true })
    @UseGuards(GqlAuthGuard)
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
    @UseGuards(GqlAuthGuard)
    async getOrCreateOneOnOneChat(
        @CurrentUser() user: User,
        @Args() args: CreateChatArgs,
    ) {
        return this.chatService.getOrCreateOneOnOneChat(user.id, args.targetUserId);
    }

    @Mutation(() => Message, { name: 'sendMessage' })
    @UseGuards(GqlAuthGuard)
    async sendMessage(
        @CurrentUser() user: User,
        @Args() args: SendMessageArgs,
    ) {
        const newMessage = await this.chatService.sendMessage(user.id, args.id_conversation, args.content, args.imageUrl, args.videoUrl, args.storyId);
        pubSub.publish('MESSAGE_ADDED_EVENT', { 
            messageAdded: newMessage, 
            inboxUpdate: newMessage 
        });
        return newMessage;
    }

    @Subscription(() => Message, {
        filter: (payload, variables) => {
            return payload.messageAdded.id_conversation === variables.id_conversation;
        },
    })
    messageAdded(@Args('id_conversation') id_conversation: string) {
        return pubSub.asyncIterableIterator('MESSAGE_ADDED_EVENT');
    }

    @ResolveField(() => Message, { nullable: true })
    @UseGuards(GqlAuthGuard)
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

    @ResolveField(() => Number, { nullable: true })
    @UseGuards(GqlAuthGuard)
    async unreadCount(
        @Parent() conversation: Conversation,
        @CurrentUser() user: User,
    ) {
        return this.messageRepository.count({
            where: {
                id_conversation: conversation.id_conversation,
                id_user: Not(user.id),
                isRead: false
            }
        });
    }

    @Mutation(() => Boolean, { name: 'markMessagesAsRead' })
    @UseGuards(GqlAuthGuard)
    async markMessagesAsRead(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
    ) {
        await this.chatService.markMessagesAsRead(id_conversation, user.id);
        pubSub.publish('MESSAGES_READ_EVENT', { messagesRead: { id_conversation, readerId: user.id } });
        return true;
    }

    @Subscription(() => ReadMessagesPayload, {
        filter: (payload, variables) => {
            return payload.messagesRead.id_conversation === variables.id_conversation;
        },
    })
    messagesRead(@Args('id_conversation') id_conversation: string) {
        return pubSub.asyncIterableIterator('MESSAGES_READ_EVENT');
    }

    @Subscription(() => Message, {
        name: 'inboxUpdate',
        filter: (payload, variables) => {
            // En una app real filtraríamos por el ID del usuario actual aquí
            return true;
        }
    })
    inboxUpdate() {
        return pubSub.asyncIterableIterator('MESSAGE_ADDED_EVENT');
    }

    @Query(() => [Message], { name: 'getChatMedia' })
    @UseGuards(GqlAuthGuard)
    async getChatMedia(
        @CurrentUser() user: User,
        @Args('id_conversation') id_conversation: string,
    ) {
        // Validación de seguridad
        const isParticipant = await this.chatService.isUserParticipant(id_conversation, user.id);
        if (!isParticipant) {
            throw new Error('No tienes permiso para ver los archivos de esta conversación');
        }

        return this.chatService.getChatMedia(id_conversation, user.id);
    }
}
