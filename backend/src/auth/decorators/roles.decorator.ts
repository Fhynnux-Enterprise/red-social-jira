import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorador que especifica qué roles tienen acceso a un endpoint.
 * Úsalo junto con RolesGuard.
 * @example @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
