import { registerEnumType } from '@nestjs/graphql';

export enum ReportStatus {
    PENDING = 'PENDING',
    RESOLVED = 'RESOLVED',
    DISMISSED = 'DISMISSED',
}

export enum ReportedItemType {
    POST = 'POST',
    JOB_OFFER = 'JOB_OFFER',
    SERVICE = 'SERVICE',
    PRODUCT = 'PRODUCT',
    COMMENT = 'COMMENT',
    USER = 'USER',
}

registerEnumType(ReportStatus, {
    name: 'ReportStatus',
    description: 'Estado de una denuncia',
});

registerEnumType(ReportedItemType, {
    name: 'ReportedItemType',
    description: 'Tipo de contenido denunciado',
});
