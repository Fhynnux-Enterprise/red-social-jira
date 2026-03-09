import { Injectable } from '@nestjs/common';
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
        return this.commentRepository.save(comment);
    }

    async getCommentsByPost(postId: string): Promise<Comment[]> {
        return this.commentRepository.find({
            where: { postId },
            relations: ['user'], // Join with User table to fetch author data
            order: { createdAt: 'ASC' }, // Oldest first (or top of the thread)
        });
    }
}
