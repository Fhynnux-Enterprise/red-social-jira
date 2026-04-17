import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { GqlAuthGuard } from './guards/gql-auth.guard';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        TypeOrmModule.forFeature([User]),
    ],
    controllers: [AuthController],
    providers: [JwtStrategy, AuthService, AuthResolver, GqlAuthGuard],
    exports: [PassportModule, JwtStrategy, AuthService, GqlAuthGuard, TypeOrmModule],
})
export class AuthModule { }
