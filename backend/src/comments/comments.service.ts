import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { Post } from '../posts/entities/post.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private commentRepository: Repository<Comment>,
        @InjectRepository(CommentLike)
        private commentLikeRepository: Repository<CommentLike>,
        @InjectRepository(Post)
        private postRepository: Repository<Post>,
        private readonly notificationsService: NotificationsService,
    ) {}

    async createComment(postId: string, content: string, userId: string, cityId: string, parentId?: string): Promise<Comment> {
        const post = await this.postRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('Publicación no encontrada');
        }

        const comment = this.commentRepository.create({
            postId,
            content,
            userId,
            parentId,
            cityId,   // ← tenant stamp
        });
        const saved = await this.commentRepository.save(comment);
        const result = await this.commentRepository.findOne({
            where: { id: saved.id },
            relations: ['user', 'likes'],
        });

        // Golden rule: Do not send auto-notifications
        if (post.authorId !== userId) {
            const commenterName = result?.user ? `${result.user.firstName} ${result.user.lastName}`.trim() : 'Un usuario';
            const title = commenterName ? `${commenterName} comentó en tu publicación` : '¡Nuevo comentario!';
            const body = content.length > 40 ? `${content.substring(0, 40)}...` : content;
            const payload = {
                type: 'POST_DETAIL',
                postId: post.id,
                senderAvatar: result?.user?.photoUrl || null,
                senderName: commenterName
            };

            // Save in-app notification in DB
            this.notificationsService.createNotification(
                post.authorId,
                title,
                body,
                NotificationType.SOCIAL,
                JSON.stringify(payload)
            ).catch(err => {
                console.error('[CommentsService] Error saving in-app notification:', err);
            });

            // Send Push Notification
            this.notificationsService.sendPushNotification(
                post.authorId,
                title,
                body,
                payload
            ).catch(err => {
                console.error('[CommentsService] Error sending push notification:', err);
            });
        }

        return this.mapComment(result!, userId);
    }

    async getCommentsByPost(postId: string, userId?: string, limit: number = 10, offset: number = 0, cityId?: string): Promise<Comment[]> {
        const where: any = { postId, parentId: IsNull() };
        if (cityId) where.cityId = cityId;

        const comments = await this.commentRepository.find({
            where,
            relations: ['user', 'likes'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
        return comments.map(comment => this.mapComment(comment, userId));
    }

    async getCommentById(id: string, userId?: string, cityId?: string): Promise<Comment | null> {
        const where: any = { id };
        if (cityId) where.cityId = cityId;

        const comment = await this.commentRepository.findOne({
            where,
            relations: ['user', 'likes', 'post', 'post.author', 'post.author.badge', 'post.media', 'post.likes'],
        });
        if (!comment) return null;
        return this.mapComment(comment, userId);
    }

    async getReplies(commentId: string, userId?: string, cityId?: string): Promise<Comment[]> {
        const where: any = { parentId: commentId };
        if (cityId) where.cityId = cityId;

        const replies = await this.commentRepository.find({
            where,
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
        comment.editedAt = new Date(); // Marca de edición real del usuario
        const saved = await this.commentRepository.save(comment);
        return this.mapComment(saved, userId);
    }

    async toggleCommentLike(commentId: string, userId: string, cityId: string): Promise<Comment> {
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
            const newLike = this.commentLikeRepository.create({ commentId, userId, cityId });
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

