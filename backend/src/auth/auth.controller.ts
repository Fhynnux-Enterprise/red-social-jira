import { Controller, Post, Get, Body, ValidationPipe, UseGuards, Req } from '@nestjs/common';
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

    @Post('sync')
    @UseGuards(JwtRestGuard)
    async syncGoogleUser(@Req() req: any) {
        return this.authService.syncGoogleUser(req.user);
    }

    @Get('me')
    @UseGuards(JwtRestGuard)
    async getProfile(@Req() req: any) {
        // req.user trae el ID desde Supabase / Custom Strategy
        return this.authService.getProfile(req.user.id);
    }
}
