import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
    @Query(() => String, { name: 'ping', description: 'Verifica si el servidor GraphQL está funcionando' })
    ping(): string {
        return 'pong - Sistema funcionando correctamente';
    }
}
