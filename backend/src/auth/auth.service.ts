import { Injectable, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    private supabase: SupabaseClient;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
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
        const { email, password, firstName, lastName, username } = registerDto;

        // 2. Llamar a supabase.auth.signUp()
        const { data: authData, error: authError } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    firstName,
                    lastName,
                    username,
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
            const newUser = this.userRepository.create({
                id: authData.user.id,
                email: email,
                username: username,
                firstName: firstName,
                lastName: lastName,
            });

            await this.userRepository.save(newUser);

            // 5. Retornar mensaje de éxito
            return {
                message: 'Usuario registrado exitosamente',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    username: newUser.username,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                },
            };
        } catch (error) {
            // Si falla la inserción local, lo ideal sería un mecanismo de compensación/rollback,
            // pero por ahora lanzamos el error para visibilidad.
            console.error('Error guardando usuario en TypeORM:', error);
            throw new InternalServerErrorException('El usuario se creó en auth, pero falló en la BD local');
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

    async syncGoogleUser(user: any) {
        // 1. Buscar si el usuario ya existe en TypeORM
        const existingUser = await this.userRepository.findOne({ where: { id: user.id } });

        if (existingUser) {
            return { message: 'Usuario sincronizado' };
        }

        // 2. Extraer metadatos de Google
        const fullName = user.metadata?.full_name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || 'Google';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
        const avatarUrl = user.metadata?.avatar_url || null;

        // 3. Generar un username único
        const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 dígitos aleatorios
        const baseUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
        const username = `${baseUsername}_${randomNum}`.slice(0, 50); // Asegurar límite de tamaño

        // 4. Crear el nuevo registro
        try {
            const newUser = this.userRepository.create({
                id: user.id,
                email: user.email,
                username: username,
                firstName: firstName,
                lastName: lastName,
                photoUrl: avatarUrl,
            });

            await this.userRepository.save(newUser);

            return { message: 'Usuario sincronizado y creado en la BD local' };
        } catch (error) {
            console.error('Error al sincronizar usuario de Google en TypeORM:', error);
            throw new InternalServerErrorException('Error al registrar usuario de Google');
        }
    }
    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['customFields', 'badge', 'posts'],
            order: {
                posts: {
                    createdAt: 'DESC'
                }
            }
        });
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }
        return user;
    }
}
