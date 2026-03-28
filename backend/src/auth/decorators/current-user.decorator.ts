import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
        const ctx = GqlExecutionContext.create(context);
        const req = ctx.getContext().req;
        if (req && req.user) return req.user;
        
        // Soporte para WebSockets
        const extraReq = ctx.getContext().extra?.request;
        if (extraReq && extraReq.user) return extraReq.user;
        
        return null;
    },
);
