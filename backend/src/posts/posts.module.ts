import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostMedia } from './entities/post-media.entity';

import { StorageModule } from '../storage/storage.module';
import { PostsSubscriber } from './subscribers/posts.subscriber';

@Module({
    imports: [
        TypeOrmModule.forFeature([Post, PostLike, PostMedia]),
        StorageModule,
    ],
    providers: [PostsResolver, PostsService, PostsSubscriber],
})
export class PostsModule { }
