import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private commentRepository: Repository<Comment>,
        @InjectRepository(CommentLike)
        private commentLikeRepository: Repository<CommentLike>,
    ) {}

    async createComment(postId: string, content: string, userId: string, parentId?: string): Promise<Comment> {
        const comment = this.commentRepository.create({
            postId,
            content,
            userId,
            parentId,
        });
        const saved = await this.commentRepository.save(comment);
        const result = await this.commentRepository.findOne({
            where: { id: saved.id },
            relations: ['user', 'likes'],
        });
        return this.mapComment(result!, userId);
    }

    async getCommentsByPost(postId: string, userId?: string): Promise<Comment[]> {
        const comments = await this.commentRepository.find({
            where: { postId, parentId: IsNull() },
            relations: ['user', 'likes'],
            order: { createdAt: 'DESC' },
        });
        return comments.map(comment => this.mapComment(comment, userId));
    }

    async getReplies(commentId: string, userId?: string): Promise<Comment[]> {
        const replies = await this.commentRepository.find({
            where: { parentId: commentId },
            relations: ['user', 'likes'],
            order: { createdAt: 'ASC' },
        });
        return replies.map(reply => this.mapComment(reply, userId));
    }

    async deleteComment(id: string, userId: string): Promise<boolean> {
        const comment = await this.commentRepository.findOne({ where: { id, userId } });
        if (!comment) {
            throw new Error('Comentario no encontrado o no tienes permiso para eliminarlo');
        }
        await this.commentRepository.softDelete(id);
        return true;
    }

    async updateComment(id: string, content: string, userId: string): Promise<Comment> {
        const comment = await this.commentRepository.findOne({ where: { id }, relations: ['user', 'likes'] });
        if (!comment) {
            throw new Error('Comentario no encontrado');
        }
        if (comment.userId !== userId) {
            throw new UnauthorizedException('No tienes permiso para editar este comentario');
        }
        comment.content = content;
        const saved = await this.commentRepository.save(comment);
        return this.mapComment(saved, userId);
    }

    async toggleCommentLike(commentId: string, userId: string): Promise<Comment> {
        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('Comentario no encontrado');
        }

        const existingLike = await this.commentLikeRepository.findOne({
            where: { commentId, userId }
        });

        if (existingLike) {
            await this.commentLikeRepository.remove(existingLike);
        } else {
            const newLike = this.commentLikeRepository.create({ commentId, userId });
            await this.commentLikeRepository.save(newLike);
        }

        const updatedComment = await this.commentRepository.findOne({
            where: { id: commentId },
            relations: ['user', 'likes']
        });

        return this.mapComment(updatedComment!, userId);
    }

    private mapComment(comment: Comment, userId?: string): Comment {
        return {
            ...comment,
            likesCount: comment.likes?.length || 0,
            isLikedByMe: userId ? comment.likes?.some(like => like.userId === userId) : false,
        };
    }
}

