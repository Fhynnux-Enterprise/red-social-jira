import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @InjectRepository(User) private userRepository: Repository<User>,
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
        });
    }

    async validate(payload: any) {
        // Obtenemos el usuario de nuestra base de datos para cargar su verdadero rol (UserRole)
        const dbUser = await this.userRepository.findOne({ where: { id: payload.sub } });
        
        return {
            id: payload.sub,
            email: payload.email,
            // Supabase manda 'authenticated' en payload.role, mejor tomamos el de nuestra BD:
            role: dbUser?.role || 'USER',
            metadata: payload.user_metadata,
            firstName: dbUser?.firstName || payload.user_metadata?.firstName,
            lastName: dbUser?.lastName || payload.user_metadata?.lastName,
            photoUrl: dbUser?.photoUrl,
        };
    }
}
