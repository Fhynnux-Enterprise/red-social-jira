import { Controller, Post, Get, Body, ValidationPipe, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRestGuard } from './guards/jwt-rest.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body(ValidationPipe) registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body(ValidationPipe) loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
    @Post('resend-confirmation')
    async resendConfirmation(@Body() body: { email: string }) {
        if (!body.email) {
            throw new UnauthorizedException('Email es requerido');
        }
        return this.authService.resendConfirmationEmail(body.email);
    }

    @Post('sync')
    @UseGuards(JwtRestGuard)
    async syncGoogleUser(@Req() req: any, @Body() body: any) {
        return this.authService.syncGoogleUser(req.user, body?.cityId);
    }

    @Post('reactivate')
    async reactivateAccount(@Body() body: { token: string }) {
        return this.authService.reactivateAccountByToken(body.token);
    }

    @Get('me')
    @UseGuards(JwtRestGuard)
    async getProfile(@Req() req: any) {
        if (req.user?.isNotSynced) {
            throw new UnauthorizedException(
                JSON.stringify({
                    code: 'USER_NOT_SYNCED',
                    message: 'El usuario no tiene un perfil en esta ciudad aún.',
                })
            );
        }
        // req.user trae el ID desde Supabase / Custom Strategy
        return this.authService.getProfile(req.user.id);
    }
}
