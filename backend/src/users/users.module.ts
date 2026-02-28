import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UserCustomField } from './entities/user-custom-field.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCustomField, UserBadge, User])],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule { }
