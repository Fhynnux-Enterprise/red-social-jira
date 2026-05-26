import { Resolver, Query, Mutation, Args, Int, ID, Context, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { pubSub } from '../common/pubsub';

@Resolver(() => Notification)
export class NotificationsResolver {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Query(() => [Notification], { name: 'getMyNotifications' })
    @UseGuards(GqlAuthGuard)
    getMyNotifications(
        @CurrentUser() user: User,
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    ): Promise<Notification[]> {
        return this.notificationsService.getMyNotifications(user.id, limit, offset);
    }

    @Query(() => Int, { name: 'getUnreadNotificationsCount' })
    @UseGuards(GqlAuthGuard)
    getUnreadCount(@CurrentUser() user: User): Promise<number> {
        return this.notificationsService.getUnreadCount(user.id);
    }

    @Mutation(() => Notification, { nullable: true })
    @UseGuards(GqlAuthGuard)
    markNotificationAsRead(
        @Args('id', { type: () => ID }) id: string,
        @CurrentUser() user: User,
    ): Promise<Notification | null> {
        return this.notificationsService.markAsRead(user.id, id);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    markAllNotificationsAsRead(@CurrentUser() user: User): Promise<boolean> {
        return this.notificationsService.markAllAsRead(user.id);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async registerPushToken(
        @CurrentUser() user: User,
        @Context() context: any,
        @Args('token', { type: () => String }) token: string,
        @Args('platform', { type: () => String, nullable: true }) platform?: string,
    ): Promise<boolean> {
        const req = context.req;
        const cityId = req.headers['x-city-id'] as string;
        
        if (!cityId) {
            throw new Error('cityId header is missing');
        }

        return this.notificationsService.registerPushToken(user.id, cityId, token, platform);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async testMyPushNotification(
        @CurrentUser() user: User,
    ): Promise<boolean> {
        const title = "¡Hola desde FynnuX! 🚀";
        const body = "Tu arquitectura Multi-tenant está enviando notificaciones reales.";
        return this.notificationsService.sendPushNotification(user.id, title, body);
    }

    @Subscription(() => Notification, {
        filter: (payload, variables) => payload.notificationAdded.userId === variables.userId,
    })
    notificationAdded(@Args('userId', { type: () => String }) userId: string) {
        return pubSub.asyncIterableIterator('NOTIFICATION_ADDED');
    }
}
