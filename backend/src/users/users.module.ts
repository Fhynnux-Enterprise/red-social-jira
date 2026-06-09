import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UserCustomField } from './entities/user-custom-field.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../auth/entities/user.entity';
import { VerificationType } from './entities/verification-type.entity';
import { UserTier } from './entities/user-tier.entity';
import { FollowsModule } from '../follows/follows.module';
import { PostsModule } from '../posts/posts.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCustomField, UserBadge, VerificationType, UserTier, User]),
    FollowsModule,
    PostsModule,
    NotificationsModule,
    UserBlocksModule,
    StorageModule,
  ],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule { }
