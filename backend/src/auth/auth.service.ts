import { Injectable, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';

@Injectable()
export class AuthService {
    private supabase: SupabaseClient;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
    ) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase Config (URL or KEY) is missing in environment variables');
        }

        // 1. Instanciar el cliente de Supabase
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async register(registerDto: RegisterDto) {
        const { email, password, firstName, lastName, username, birthDate, cityId = 'chunchi' } = registerDto;

        // 1. Verificación local (preemptiva) para dar feedback claro al usuario
        const existingEmail = await this.userRepository.findOne({ where: { email } });
        if (existingEmail) {
            throw new BadRequestException('El correo ya se encuentra registrado. Por favor, intenta iniciar sesión.');
        }

        const existingUsername = await this.userRepository.findOne({ where: { username } });
        if (existingUsername) {
            throw new BadRequestException('El nombre de usuario ya está en uso. Por favor, elige otro.');
        }

        const appName = cityId === 'alausi' ? 'Alausí City App' : 'Chunchi City App';

        // 2. Llamar a supabase.auth.signUp()
        const { data: authData, error: authError } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    firstName,
                    lastName,
                    username,
                    birthDate,
                    nombre_app: appName,
                },
            },
        });

        // 3. Manejar errores de Supabase
        if (authError) {
            throw new BadRequestException(authError.message);
        }

        if (!authData.user) {
            throw new InternalServerErrorException('Error desconocido al crear usuario en Supabase');
        }

        try {
            // 4. Insertar nuevo registro en nuestra BD local (TypeORM)
            // Generar ID determinista para soportar múltiples perfiles por ciudad (multi-tenant)
            const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
            const localId = uuidv5(`${authData.user.id}:${cityId}`, NAMESPACE);

            const newUser = this.userRepository.create({
                id: localId,
                email: email,
                username: username,
                firstName: firstName,
                lastName: lastName,
                birthDate: birthDate,
                cityId: cityId,   // ← tenant asignado al registrarse
            });

            await this.userRepository.save(newUser);

            // Enviar notificación de bienvenida
            try {
                await this.notificationsService.createNotification(
                    newUser.id,
                    `¡Bienvenido a ${appName}! 🎉`,
                    'Mantén activas las notificaciones para recibir las últimas noticias, eventos y reportes del cantón.',
                    NotificationType.SYSTEM
                );
            } catch (notifError) {
                console.error('Error al crear la notificación de bienvenida:', notifError);
            }

            // 5. Retornar mensaje de éxito
            return {
                message: 'Usuario registrado exitosamente',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    username: newUser.username,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    birthDate: newUser.birthDate,
                },
            };
        } catch (error: any) {
            console.error('Error guardando usuario en TypeORM:', error);
            
            // Si es un error de unicidad en PostgreSQL (ej. email o username duplicado concurrentemente)
            if (error.code === '23505') {
                if (error.detail?.includes('email')) {
                    throw new BadRequestException('El correo ya se encuentra registrado.');
                }
                if (error.detail?.includes('username')) {
                    throw new BadRequestException('El nombre de usuario ya está en uso.');
                }
            }
            
            throw new InternalServerErrorException('No se pudo completar el registro local. Por favor, intenta de nuevo.');
        }
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // 1. Llamar a signInWithPassword
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });

        // 2. Manejar errores
        if (error) {
            if (error.message === 'Email not confirmed') {
                throw new UnauthorizedException(
                    JSON.stringify({
                        code: 'EMAIL_NOT_CONFIRMED',
                        message: 'Email no confirmado',
                    })
                );
            }
            throw new UnauthorizedException(error.message);
        }

        if (!data.session) {
            throw new InternalServerErrorException('Error al obtener la sesión de Supabase');
        }

        // 3 y 4. Extraer el token y retornarlo
        return {
            message: 'Login exitoso',
            access_token: data.session.access_token,
        };
    }

    async resendConfirmationEmail(email: string) {
        const { error } = await this.supabase.auth.resend({
            type: 'signup',
            email,
        });

        if (error) {
            throw new BadRequestException(error.message);
        }
        return { message: 'Correo de confirmación reenviado exitosamente' };
    }

    async syncGoogleUser(user: any, cityId?: string) {
        const tenant = cityId || 'chunchi';
        
        console.log('[AuthService.syncGoogleUser] Iniciando sync para:', { user, tenant });

        if (!user || !user.id) {
             throw new InternalServerErrorException('No se recibió el ID del usuario');
        }

        // 1. Generar un ID local DETERMINISTA basado en (SupabaseID + CityID)
        // Esto permite que el MISMO usuario de Google tenga cuentas separadas por ciudad
        // sin colisiones de ID en nuestra llave primaria.
        const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Namespace DNS estándar
        const localId = uuidv5(`${user.id}:${tenant}`, NAMESPACE);
        
        console.log('[AuthService.syncGoogleUser] localId generado:', localId);

        // 2. Buscar si ya existe este usuario ESPECÍFICO para esta ciudad
        if (user.email) {
            const existingUser = await this.userRepository.findOne({ 
                where: { email: user.email, cityId: tenant },
                withDeleted: true
            });

            if (existingUser) {
                console.log('[AuthService.syncGoogleUser] Usuario ya existe por email (incluyendo soft-deleted):', existingUser.id);
                // Si el usuario existe pero no tiene el deterministic ID, podriamos tener un problema.
                // Lo dejamos pasar, pero la proxima vez JwtStrategy lo encontrará por ID directo (si es email/pass)
                // o fallará si es Google SSO pero el ID era distinto.
                return { message: 'Usuario sincronizado' };
            }
        }

        // 2. Extraer metadatos de Google
        const fullName = user.metadata?.full_name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || 'Google';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
        const avatarUrl = user.metadata?.avatar_url || null;

        // 3. Generar un username único
        const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 dígitos aleatorios
        const baseUsername = user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') : `user_${randomNum}`;
        const username = `${baseUsername}_${randomNum}`.slice(0, 50); // Asegurar límite de tamaño

        // 4. Crear el nuevo registro usando el localId generado
        try {
            console.log('[AuthService.syncGoogleUser] Creando nuevo usuario con ID:', localId);
            const newUser = this.userRepository.create({
                id: localId, // ← ID determinista por ciudad
                email: user.email || `${username}@placeholder.com`,
                username: username,
                firstName: firstName,
                lastName: lastName,
                photoUrl: avatarUrl,
                cityId: tenant,  // ← Google SSO users tenant
            });

            await this.userRepository.save(newUser);

            console.log('[AuthService.syncGoogleUser] Éxito al guardar en TypeORM');
            return { message: 'Usuario sincronizado y creado en la BD local' };
        } catch (error) {
            console.error('Error al sincronizar usuario de Google en TypeORM:', error);
            throw new InternalServerErrorException('Error al registrar usuario de Google');
        }
    }

    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['customFields', 'badge', 'posts', 'posts.author', 'posts.likes', 'posts.likes.user'],
            order: {
                posts: {
                    createdAt: 'DESC'
                }
            }
        });

        if (!user) {
            throw new UnauthorizedException(
                JSON.stringify({
                    code: 'USER_NOT_SYNCED',
                    message: 'El usuario no tiene un perfil en esta ciudad aún.',
                })
            );
        }

        // Si el usuario está baneado, lanzar excepción con JSON estructurado
        // igual que el GqlAuthGuard, para que el frontend pueda detectar el ban
        // tanto al iniciar como durante el uso de la app
        if (user.bannedUntil && user.bannedUntil > new Date()) {
            throw new UnauthorizedException(
                JSON.stringify({
                    code: 'USER_BANNED',
                    bannedUntil: user.bannedUntil.toISOString(),
                    banReason: user.banReason ?? 'Violación de las normas de la comunidad',
                })
            );
        }

        return user;
    }

    async reactivateAccountByToken(token: string) {
        // 1. Obtener el usuario de Supabase usando el token
        const { data: { user }, error } = await this.supabase.auth.getUser(token);
        if (error || !user) {
            throw new UnauthorizedException('Token inválido o expirado.');
        }

        // 2. Buscar al usuario en la base de datos local (incluyendo eliminados)
        const dbUser = await this.userRepository.findOne({
            where: { email: user.email },
            withDeleted: true,
        });

        if (!dbUser) {
            throw new BadRequestException('Usuario no encontrado.');
        }

        if (!dbUser.deletedAt) {
            throw new BadRequestException('La cuenta no está desactivada.');
        }

        const daysSinceDeletion = (Date.now() - new Date(dbUser.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDeletion > 30) {
            throw new UnauthorizedException('Esta cuenta ha sido eliminada permanentemente.');
        }

        // 3. Reactivar la cuenta usando el servicio de usuarios
        await this.usersService.reactivateAccount(dbUser.id);

        return { message: 'Cuenta reactivada exitosamente.' };
    }
}
