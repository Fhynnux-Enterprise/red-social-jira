import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
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
        @Context() context: any,
    ): Promise<Comment> {
        const userId = context.req.user.id;
        return this.commentsService.createComment(postId, content, userId);
    }

    @Query(() => [Comment], { name: 'getCommentsByPost' })
    async getCommentsByPost(
        @Args('postId') postId: string,
    ): Promise<Comment[]> {
        return this.commentsService.getCommentsByPost(postId);
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
}
