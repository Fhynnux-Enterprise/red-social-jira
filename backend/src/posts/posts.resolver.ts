import { Resolver, Query, Mutation, Args, Context, ResolveField, Parent, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { PostMediaInput } from './dto/post-media.input';

@Resolver(() => Post)
export class PostsResolver {
    constructor(private readonly postsService: PostsService) { }

    @ResolveField(() => Int)
    async commentsCount(@Parent() post: Post): Promise<number> {
        return post.comments?.length ?? 0;
    }

    @Query(() => [Post], { name: 'getPosts' })
    @UseGuards(JwtGqlGuard)
    async getPosts(): Promise<Post[]> {
        return this.postsService.findAll();
    }

    @Mutation(() => Post, { name: 'createPost' })
    @UseGuards(JwtGqlGuard)
    async createPost(
        @Args('content') content: string,
        @Args('media', { type: () => [PostMediaInput], nullable: true }) media: PostMediaInput[],
        @Context() context: any,
    ): Promise<Post> {
        const authorId = context.req.user.id;
        return this.postsService.createPost(content, authorId, media);
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
