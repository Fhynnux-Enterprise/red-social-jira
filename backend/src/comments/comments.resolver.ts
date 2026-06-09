import { Resolver, Query, Mutation, Args, Context, ResolveField, Parent, Int } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Comment)
export class CommentsResolver {
    constructor(private readonly commentsService: CommentsService) {}

    @Mutation(() => Comment, { name: 'createComment' })
    @UseGuards(JwtGqlGuard)
    async createComment(
        @Args('postId') postId: string,
        @Args('content') content: string,
        @Args('parentId', { nullable: true }) parentId: string,
        @CurrentUser() user: any,
    ): Promise<Comment> {
        return this.commentsService.createComment(postId, content, user.id, user.cityId, parentId);
    }

    @Query(() => [Comment], { name: 'getCommentsByPost' })
    @UseGuards(JwtGqlGuard)
    async getCommentsByPost(
        @Args('postId') postId: string,
        @Args('limit', { type: () => Int, defaultValue: 10, nullable: true }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0, nullable: true }) offset: number,
        @Context() context: any,
    ): Promise<Comment[]> {
        const user = context.req?.user;
        return this.commentsService.getCommentsByPost(postId, user?.id, limit ?? 10, offset ?? 0, user?.cityId);
    }

    @Query(() => Comment, { name: 'getCommentById', nullable: true })
    @UseGuards(JwtGqlGuard)
    async getCommentById(
        @Args('id') id: string,
        @Context() context: any,
    ): Promise<Comment | null> {
        const user = context.req?.user;
        const comment = await this.commentsService.getCommentById(id, user?.id, user?.cityId, true);
        if (!comment) return null;

        if (comment.deletedAt) {
            const isAuthor = comment.userId === user?.id;
            const isModeratorOrAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
            if (!isAuthor && !isModeratorOrAdmin) {
                throw new NotFoundException('Comentario no encontrado');
            }
        }
        return comment;
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
        @CurrentUser() user: any,
    ): Promise<Comment> {
        return this.commentsService.toggleCommentLike(commentId, user.id, user.cityId);
    }

    @ResolveField(() => [Comment])
    async replies(
        @Parent() comment: Comment,
        @Context() context: any,
    ): Promise<Comment[]> {
        const user = context.req?.user;
        return this.commentsService.getReplies(comment.id, user?.id, user?.cityId);
    }
}

