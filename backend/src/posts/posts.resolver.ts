import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';

@Resolver(() => Post)
export class PostsResolver {
    constructor(private readonly postsService: PostsService) { }

    @Query(() => [Post], { name: 'getPosts' })
    @UseGuards(JwtGqlGuard)
    async getPosts(): Promise<Post[]> {
        return this.postsService.findAll();
    }

    @Mutation(() => Post, { name: 'createPost' })
    @UseGuards(JwtGqlGuard)
    async createPost(
        @Args('content') content: string,
        @Context() context: any,
    ): Promise<Post> {
        const authorId = context.req.user.id;
        return this.postsService.createPost(content, authorId);
    }
}
