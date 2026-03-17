import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postsRepository: Repository<Post>,
        @InjectRepository(PostLike)
        private readonly postLikesRepository: Repository<PostLike>,
    ) { }

    async createPost(content: string, authorId: string): Promise<Post> {
        const newPost = this.postsRepository.create({
            content,
            authorId,
        });
        const savedPost = await this.postsRepository.save(newPost);
        const fullyLoadedPost = await this.postsRepository.findOne({
            where: { id: savedPost.id },
            relations: ['author', 'likes', 'likes.user', 'comments'],
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
            relations: ['author', 'likes', 'likes.user', 'comments'],
        });
    }

    async updatePost(id: string, content: string, userId: string): Promise<Post> {
        const post = await this.postsRepository.findOne({ where: { id }, relations: ['author', 'likes', 'likes.user', 'comments'] });
        if (!post) {
            throw new NotFoundException('Publicación no encontrada');
        }
        if (post.authorId !== userId) {
            throw new UnauthorizedException('No puedes modificar un post que no es tuyo');
        }

        post.content = content;
        await this.postsRepository.save(post);
        return post;
    }

    async deletePost(id: string, userId: string): Promise<boolean> {
        const post = await this.postsRepository.findOne({ where: { id } });
        if (!post) {
            throw new NotFoundException('Publicación no encontrada');
        }
        if (post.authorId !== userId) {
            throw new UnauthorizedException('No puedes modificar un post que no es tuyo');
        }

        await this.postsRepository.softDelete(id);
        return true;
    }

    async toggleLike(postId: string, userId: string): Promise<Post> {
        const post = await this.postsRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('Publicación no encontrada');
        }

        const existingLike = await this.postLikesRepository.findOne({
            where: { postId, userId }
        });

        if (existingLike) {
            await this.postLikesRepository.remove(existingLike);
        } else {
            const newLike = this.postLikesRepository.create({ postId, userId });
            await this.postLikesRepository.save(newLike);
        }

        const fullyLoadedPost = await this.postsRepository.findOne({
            where: { id: postId },
            relations: ['author', 'likes', 'likes.user', 'comments']
        });

        if (!fullyLoadedPost) {
            throw new NotFoundException('Publicación no encontrada despúes de actualizar');
        }

        return fullyLoadedPost;
    }
}
