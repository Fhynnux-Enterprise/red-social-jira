import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsService } from './follows.service';
import { FollowsResolver } from './follows.resolver';
import { Follow } from './entities/follow.entity';
import { User } from '../auth/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Follow, User]),
    ],
    providers: [FollowsService, FollowsResolver],
    exports: [FollowsService],
})
export class FollowsModule { }
