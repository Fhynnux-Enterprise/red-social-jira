import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { GraphQLError } from 'graphql';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

@Injectable()
export class SystemStatusInterceptor implements NestInterceptor {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // Solo aplica para GraphQL
    if (context.getType<string>() !== 'graphql') {
      return next.handle();
    }

    const ctx = GqlExecutionContext.create(context);
    const info = ctx.getInfo();
    
    // Ignorar introspección de GraphQL
    if (info && info.parentType && info.parentType.name === 'Query' && info.fieldName === '__schema') {
      return next.handle();
    }

    // Operaciones que NUNCA deben bloquearse (ej. obtener config o loguearse para ser admin)
    const allowedOperations = ['getSystemConfig', 'login', 'loginWithGoogle'];
    if (info && allowedOperations.includes(info.fieldName)) {
      return next.handle();
    }

    const req = ctx.getContext().req;
    // Si no hay req, seguimos (ej. algunas suscripciones websocket extrañas, aunque debería haber)
    if (!req) return next.handle();

    // Obtener la configuración actual del sistema
    const config = await this.systemSettingsService.getGlobalSettings();
    const user = req.user;
    const isAdmin = user && user.role === 'ADMIN';

    // 1. EVALUAR VERSIÓN DE LA APP
    // El frontend debe enviar 'x-app-version' en los headers
    const clientVersion = req?.headers?.['x-app-version'] as string;
    
    if (clientVersion && config.minRequiredAppVersion) {
      if (!isAdmin && this.isVersionOutdated(clientVersion, config.minRequiredAppVersion)) {
        throw new GraphQLError('App update required', {
          extensions: {
            code: 'UPDATE_REQUIRED',
            message: 'Es necesario actualizar la aplicación para continuar.',
          },
        });
      }
    }

    // 2. EVALUAR MANTENIMIENTO
    if (config.isMaintenanceMode && !isAdmin) {
      throw new GraphQLError('System is in maintenance mode', {
        extensions: {
          code: 'MAINTENANCE_MODE',
          message: config.maintenanceMessage || 'El sistema se encuentra en mantenimiento.',
        },
      });
    }

    return next.handle();
  }

  // Función simple para comparar versiones semánticas sin depender de la librería 'semver'
  private isVersionOutdated(clientVersion: string, minVersion: string): boolean {
    const parse = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
    const clientParts = parse(clientVersion);
    const minParts = parse(minVersion);

    for (let i = 0; i < Math.max(clientParts.length, minParts.length); i++) {
      const c = clientParts[i] || 0;
      const m = minParts[i] || 0;
      if (c < m) return true; // El cliente es menor
      if (c > m) return false; // El cliente es mayor
    }
    return false; // Son iguales
  }
}
