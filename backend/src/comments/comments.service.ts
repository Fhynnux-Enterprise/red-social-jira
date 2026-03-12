import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private commentRepository: Repository<Comment>,
    ) {}

    async createComment(postId: string, content: string, userId: string): Promise<Comment> {
        const comment = this.commentRepository.create({
            postId,
            content,
            userId,
        });
        const saved = await this.commentRepository.save(comment);
        // Load the user relation so the frontend can display the author immediately
        return this.commentRepository.findOne({
            where: { id: saved.id },
            relations: ['user'],
        }) as Promise<Comment>;
    }

    async getCommentsByPost(postId: string): Promise<Comment[]> {
        return this.commentRepository.find({
            where: { postId },
            relations: ['user'], // Join with User table to fetch author data
            order: { createdAt: 'DESC' }, // Newest first
        });
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
        const comment = await this.commentRepository.findOne({ where: { id }, relations: ['user'] });
        if (!comment) {
            throw new Error('Comentario no encontrado');
        }
        if (comment.userId !== userId) {
            throw new UnauthorizedException('No tienes permiso para editar este comentario');
        }
        comment.content = content;
        return this.commentRepository.save(comment);
    }
}
