import {
    Injectable,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
    constructor(
        private readonly dataSource: DataSource,
    ) {
        super();
    }

    getRequest(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context);
        let req = ctx.getContext().req;

        // Soporte para WebSockets (GraphQL Subscriptions)
        if (!req && ctx.getContext().extra && ctx.getContext().extra.request) {
            req = ctx.getContext().extra.request;
        }

        // Fix de seguridad por si 'request' o 'headers' no existen (ej. Websockets iniciales sin enviar datos)
        if (!req) {
            req = { headers: {} };
            ctx.getContext().req = req;
        } else if (!req.headers) {
            req.headers = {};
        }

        // Express-jwt/passport buscan encabezados en minúsculas 'authorization'
        if (req.headers && req.headers.Authorization && !req.headers.authorization) {
            req.headers.authorization = req.headers.Authorization;
        }

        return req;
    }

    /**
     * Se ejecuta DESPUÉS de que Passport valida el JWT.
     * Aquí comprobamos si el usuario tiene un ban activo en BD.
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 1. Deja que Passport haga su validación JWT normal
        const isValid = await super.canActivate(context);
        if (!isValid) return false;

        // 2. Extraer el usuario populado por el JWT strategy
        const ctx = GqlExecutionContext.create(context);
        const req = ctx.getContext().req;
        const jwtUser = req?.user;

        if (!jwtUser?.id) return true; // Sin usuario (ruta pública), dejar pasar

        // 3. Consultar la BD directamente con DataSource (disponible globalmente)
        const dbUser = await this.dataSource
            .getRepository(User)
            .findOne({
                where: { id: jwtUser.id },
                select: ['id', 'bannedUntil', 'banReason'],
            });

        if (!dbUser) return true;

        // 4. Comprobar si el ban sigue activo
        if (dbUser.bannedUntil && dbUser.bannedUntil > new Date()) {
            const info = ctx.getInfo();
            if (info && info.fieldName === 'createAppeal') {
                return true; // Permitimos a los usuarios baneados crear apelaciones
            }

            throw new UnauthorizedException(
                JSON.stringify({
                    code: 'USER_BANNED',
                    bannedUntil: dbUser.bannedUntil.toISOString(),
                    banReason: dbUser.banReason ?? 'Violación de las normas de la comunidad',
                }),
            );
        }

        return true;
    }
}
