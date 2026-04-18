import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
    SYSTEM = 'SYSTEM',
    MODERATION = 'MODERATION',
    SOCIAL = 'SOCIAL',
}

registerEnumType(NotificationType, {
    name: 'NotificationType',
    description: 'Tipo de notificación',
});
