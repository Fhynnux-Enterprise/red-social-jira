import { registerEnumType } from '@nestjs/graphql';

export enum AppealStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum AppealType {
    ACCOUNT_BAN = 'ACCOUNT_BAN',
    CONTENT_DELETION = 'CONTENT_DELETION',
}

registerEnumType(AppealStatus, {
    name: 'AppealStatus',
    description: 'Estado de la apelación',
});

registerEnumType(AppealType, {
    name: 'AppealType',
    description: 'Tipo de apelación',
});
