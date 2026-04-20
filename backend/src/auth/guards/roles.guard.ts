import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

/**
 * Guard que verifica si el usuario autenticado posee alguno de los
 * roles requeridos por el decorador @Roles().
 *
 * Siempre debe combinarse con GqlAuthGuard para garantizar
 * que req.user esté populado antes de la comprobación de roles.
 *
 * @example
 * @UseGuards(GqlAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * @Query(...)
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Si no se especificaron roles, el endpoint es público (o protegido solo por JWT)
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        // Extraer el usuario del contexto GraphQL
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();
        const user = req?.user;

        if (!user) {
            throw new ForbiddenException('Acceso denegado: usuario no autenticado.');
        }

        const hasRole = requiredRoles.some((role) => user.role === role);
        if (!hasRole) {
            throw new ForbiddenException(
                `Acceso denegado: se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}.`,
            );
        }

        return true;
    }
}
