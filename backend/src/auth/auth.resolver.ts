import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
    @Query(() => String, { name: 'me', description: 'Obtiene los datos del usuario logueado en base al token JWT' })
    @UseGuards(GqlAuthGuard)
    getMe(@CurrentUser() user: any): string {
        return `Hola, tu ID es ${user.id} y tu correo es ${user.email}`;
    }
}
