import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Post, PostLike])],
    providers: [PostsResolver, PostsService],
})
export class PostsModule { }
