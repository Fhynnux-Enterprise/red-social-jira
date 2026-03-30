import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
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
            // Para que passport guarde el .user en el contexto
            ctx.getContext().req = req; 
        } else if (!req.headers) {
            req.headers = {};
        }

        // Expres-jwt/passport buscan encabezados en minúsculas 'authorization'
        if (req.headers && req.headers.Authorization && !req.headers.authorization) {
            req.headers.authorization = req.headers.Authorization;
        }

        // Retornamos la MISMA referencia mutada, nunca un clon, para que passport adjunte req.user al original
        return req;
    }
}
