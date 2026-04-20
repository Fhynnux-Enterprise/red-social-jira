import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsService } from './follows.service';
import { FollowsResolver } from './follows.resolver';
import { Follow } from './entities/follow.entity';
import { User } from '../auth/entities/user.entity';

import { UserBlocksModule } from '../user-blocks/user-blocks.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Follow, User]),
        UserBlocksModule,
    ],
    providers: [FollowsService, FollowsResolver],
    exports: [FollowsService],
})
export class FollowsModule { }
