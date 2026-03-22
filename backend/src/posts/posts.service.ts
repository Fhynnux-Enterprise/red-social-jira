import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostMediaInput } from './dto/post-media.input';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postsRepository: Repository<Post>,
        @InjectRepository(PostLike)
        private readonly postLikesRepository: Repository<PostLike>,
        @InjectRepository(PostMedia)
        private readonly postMediaRepository: Repository<PostMedia>,
        private readonly dataSource: DataSource,
    ) { }

    async createPost(content: string, authorId: string, media?: PostMediaInput[]): Promise<Post> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let newPost = this.postsRepository.create({
                content,
                authorId,
            });
            newPost = await queryRunner.manager.save(newPost);

            if (media && media.length > 0) {
                const postMediaEntities = media.map(m => this.postMediaRepository.create({
                    url: m.url,
                    type: m.type,
                    order: m.order,
                    postId: newPost.id,
                }));
                await queryRunner.manager.save(postMediaEntities);
            }

            await queryRunner.commitTransaction();

            const fullyLoadedPost = await this.postsRepository.findOne({
                where: { id: newPost.id },
                relations: ['author', 'likes', 'likes.user', 'comments', 'media'],
                order: { media: { order: 'ASC' } }
            });

            if (!fullyLoadedPost) {
                throw new Error('Error al recuperar el post creado');
            }
            return fullyLoadedPost;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(): Promise<Post[]> {
        return this.postsRepository.find({
            order: {
                createdAt: 'DESC',
                media: {
                    order: 'ASC'
                }
            },
            relations: ['author', 'likes', 'likes.user', 'comments', 'media'],
        });
    }

    async updatePost(id: string, content: string, userId: string): Promise<Post> {
        const post = await this.postsRepository.findOne({ where: { id }, relations: ['author', 'likes', 'likes.user', 'comments', 'media'] });
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
        const post = await this.postsRepository.findOne({ 
            where: { id },
            relations: ['media'] // Importante cargar la relación para que el suscriptor de borrado tenga data
        });
        if (!post) {
            throw new NotFoundException('Publicación no encontrada');
        }
        if (post.authorId !== userId) {
            throw new UnauthorizedException('No puedes modificar un post que no es tuyo');
        }

        // Usamos softRemove para aplicar el borrado lógico y que el Cascade 
        // propague el borrado a PostMedia, disparando el suscriptor de Supabase
        await this.postsRepository.softRemove(post);
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
            relations: ['author', 'likes', 'likes.user', 'comments', 'media']
        });

        if (!fullyLoadedPost) {
            throw new NotFoundException('Publicación no encontrada despúes de actualizar');
        }

        return fullyLoadedPost;
    }
}
