import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';
import { User } from '../entities/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly usersService: UsersService,
    ) {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');

        if (!supabaseUrl) {
            throw new Error('SUPABASE_URL is not defined in the environment variables');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            }),
            algorithms: ['RS256', 'ES256'],
            passReqToCallback: true, // Permitir acceso a los headers
        });
    }

    async validate(req: any, payload: any) {
        // Obtenemos el cityId del header para saber en qué contexto de app estamos
        const cityId = req.headers['x-city-id'] || 'chunchi';
        
        // 1. Intentar buscar por ID directo (Usuarios Email/Password) 
        // Buscamos con withDeleted: true para saber si la cuenta está en período de gracia (soft-deleted)
        let dbUser = await this.userRepository.findOne({ 
            where: { id: payload.sub, cityId: cityId },
            withDeleted: true
        });

        // 2. Si no existe, intentar buscar por ID determinista (Usuarios Google SSO)
        if (!dbUser) {
            const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
            const deterministicId = uuidv5(`${payload.sub}:${cityId}`, NAMESPACE);
            dbUser = await this.userRepository.findOne({ 
                where: { id: deterministicId, cityId: cityId },
                withDeleted: true
            });
        }

        // Si el usuario existe pero está soft-deleted (tiene deletedAt establecido)
        if (dbUser && dbUser.deletedAt) {
            const daysSinceDeletion = (Date.now() - new Date(dbUser.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDeletion <= 30) {
                // Lanzamos una excepción estructurada para que el frontend pregunte si desea reactivar la cuenta
                throw new UnauthorizedException(
                    JSON.stringify({
                        code: 'ACCOUNT_DEACTIVATED',
                        message: 'Tu cuenta está desactivada pero se puede reactivar.',
                    })
                );
            } else {
                // Si pasaron los 30 días, tratamos como no existente/eliminado permanente
                throw new UnauthorizedException('Esta cuenta ha sido eliminada permanentemente.');
            }
        }
        
        if (!dbUser) {
            // El usuario existe en Supabase pero no tiene un perfil en ESTA ciudad
            return {
                id: payload.sub,
                email: payload.email,
                role: 'USER',
                cityId: cityId,
                metadata: payload.user_metadata,
                isNotSynced: true
            };
        }

        return {
            id: dbUser.id, 
            supabaseId: payload.sub,
            email: payload.email,
            role: dbUser.role || 'USER',
            cityId: dbUser.cityId,
            metadata: payload.user_metadata,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            photoUrl: dbUser.photoUrl,
        };
    }
}
