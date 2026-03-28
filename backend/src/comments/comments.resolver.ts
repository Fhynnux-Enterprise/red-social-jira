import { Resolver, Query, Mutation, Args, Context, ResolveField, Parent, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';

@Resolver(() => Comment)
export class CommentsResolver {
    constructor(private readonly commentsService: CommentsService) {}

    @Mutation(() => Comment, { name: 'createComment' })
    @UseGuards(JwtGqlGuard)
    async createComment(
        @Args('postId') postId: string,
        @Args('content') content: string,
        @Args('parentId', { nullable: true }) parentId: string,
        @Context() context: any,
    ): Promise<Comment> {
        const userId = context.req.user.id;
        return this.commentsService.createComment(postId, content, userId, parentId);
    }

    @Query(() => [Comment], { name: 'getCommentsByPost' })
    @UseGuards(JwtGqlGuard)
    async getCommentsByPost(
        @Args('postId') postId: string,
        @Args('limit', { type: () => Int, defaultValue: 10, nullable: true }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0, nullable: true }) offset: number,
        @Context() context: any,
    ): Promise<Comment[]> {
        const userId = context.req?.user?.id;
        return this.commentsService.getCommentsByPost(postId, userId, limit ?? 10, offset ?? 0);
    }

    @Mutation(() => Boolean, { name: 'deleteComment' })
    @UseGuards(JwtGqlGuard)
    async deleteComment(
        @Args('id') id: string,
        @Context() context: any,
    ): Promise<boolean> {
        const userId = context.req.user.id;
        return this.commentsService.deleteComment(id, userId);
    }

    @Mutation(() => Comment, { name: 'updateComment' })
    @UseGuards(JwtGqlGuard)
    async updateComment(
        @Args('id') id: string,
        @Args('content') content: string,
        @Context() context: any,
    ): Promise<Comment> {
        const userId = context.req.user.id;
        return this.commentsService.updateComment(id, content, userId);
    }

    @Mutation(() => Comment, { name: 'toggleCommentLike' })
    @UseGuards(JwtGqlGuard)
    async toggleCommentLike(
        @Args('commentId') commentId: string,
        @Context() context: any,
    ): Promise<Comment> {
        const userId = context.req.user.id;
        return this.commentsService.toggleCommentLike(commentId, userId);
    }

    @ResolveField(() => [Comment])
    async replies(
        @Parent() comment: Comment,
        @Context() context: any,
    ): Promise<Comment[]> {
        const userId = context.req?.user?.id;
        return this.commentsService.getReplies(comment.id, userId);
    }
}

