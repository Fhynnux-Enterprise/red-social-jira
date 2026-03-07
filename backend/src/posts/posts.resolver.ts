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

    @Mutation(() => Post, { name: 'updatePost' })
    @UseGuards(JwtGqlGuard)
    async updatePost(
        @Args('id') id: string,
        @Args('content') content: string,
        @Context() context: any,
    ): Promise<Post> {
        const userId = context.req.user.id;
        return this.postsService.updatePost(id, content, userId);
    }

    @Mutation(() => Boolean, { name: 'deletePost' })
    @UseGuards(JwtGqlGuard)
    async deletePost(
        @Args('id') id: string,
        @Context() context: any,
    ): Promise<boolean> {
        const userId = context.req.user.id;
        return this.postsService.deletePost(id, userId);
    }

    @Mutation(() => Post, { name: 'toggleLike' })
    @UseGuards(JwtGqlGuard)
    async toggleLike(
        @Args('postId') postId: string,
        @Context() context: any,
    ): Promise<Post> {
        const userId = context.req.user.id;
        return this.postsService.toggleLike(postId, userId);
    }
}
