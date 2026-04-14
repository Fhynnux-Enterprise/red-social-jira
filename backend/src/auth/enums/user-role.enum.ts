import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
    MODERATOR = 'MODERATOR',
    VERIFIED_BUSINESS = 'VERIFIED_BUSINESS',
}

registerEnumType(UserRole, {
    name: 'UserRole',
    description: 'Roles disponibles en la plataforma',
});
