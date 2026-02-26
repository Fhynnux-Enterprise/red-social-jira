import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Post])],
    providers: [PostsResolver, PostsService],
})
export class PostsModule { }
