import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postsRepository: Repository<Post>,
    ) { }

    async createPost(content: string, authorId: string): Promise<Post> {
        const newPost = this.postsRepository.create({
            content,
            authorId,
        });
        const savedPost = await this.postsRepository.save(newPost);
        const fullyLoadedPost = await this.postsRepository.findOne({
            where: { id: savedPost.id },
            relations: ['author'],
        });
        if (!fullyLoadedPost) {
            throw new Error('Error al recuperar el post creado');
        }
        return fullyLoadedPost;
    }

    async findAll(): Promise<Post[]> {
        return this.postsRepository.find({
            order: {
                createdAt: 'DESC',
            },
            relations: ['author'],
        });
    }
}
