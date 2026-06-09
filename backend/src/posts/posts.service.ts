import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostMedia } from './entities/post-media.entity';
import { SavedItem, SavedItemType } from './entities/saved-item.entity';
import { PostMediaInput } from './dto/post-media.input';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { StoreProduct } from '../store/entities/store-product.entity';
import { StoreProductLike } from '../store/entities/store-product-like.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';
import { UserBlock } from '../user-blocks/entities/user-block.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';
import { VisionService } from '../storage/vision.service';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postsRepository: Repository<Post>,
        @InjectRepository(PostLike)
        private readonly postLikesRepository: Repository<PostLike>,
        @InjectRepository(PostMedia)
        private readonly postMediaRepository: Repository<PostMedia>,
        @InjectRepository(SavedItem)
        private readonly savedItemsRepository: Repository<SavedItem>,
        @InjectRepository(StoreProduct)
        private readonly storeProductsRepository: Repository<StoreProduct>,
        @InjectRepository(StoreProductLike)
        private readonly storeProductLikesRepository: Repository<StoreProductLike>,
        @InjectRepository(JobOffer)
        private readonly jobOffersRepository: Repository<JobOffer>,
        @InjectRepository(ProfessionalProfile)
        private readonly professionalProfilesRepository: Repository<ProfessionalProfile>,
        private readonly dataSource: DataSource,
        private readonly userBlocksService: UserBlocksService,
        private readonly notificationsService: NotificationsService,
        private readonly visionService: VisionService,
    ) { }

    async createPost(content: string, authorId: string, cityId: string, media?: PostMediaInput[], title?: string): Promise<Post> {
        // Validar la seguridad de todas las imágenes con la API de Google Vision antes de procesar el post
        if (media && media.length > 0) {
            for (const item of media) {
                if (item.type === 'IMAGE' || item.url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
                    await this.visionService.validateImageSafety(item.url);
                }
            }
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let newPost = this.postsRepository.create({
                content,
                title,
                authorId,
                cityId,   // ← tenant stamp
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

    async findAll(limit: number = 5, offset: number = 0, viewerId?: string, cityId?: string): Promise<Post[]> {
        const query = this.postsRepository.createQueryBuilder('post')
            .leftJoinAndSelect('post.author', 'author')
            .leftJoinAndSelect('post.likes', 'likes')
            .leftJoinAndSelect('likes.user', 'likeUser')
            .leftJoinAndSelect('post.media', 'media')
            .where('post.deletedAt IS NULL');

        // ── Multi-tenant filter ───────────────────────────────────────────────
        if (cityId) {
            query.andWhere('post.cityId = :cityId', { cityId });
        }

        if (viewerId) {
            query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from(UserBlock, 'ub')
                    .where('ub.blockerId = :viewerId AND ub.blockedId = post.authorId')
                    .orWhere('ub.blockerId = post.authorId AND ub.blockedId = :viewerId')
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            });
            query.setParameter('viewerId', viewerId);
        }

        const posts = await query
            .orderBy('post.createdAt', 'DESC')
            .addOrderBy('post.id', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();

        // Sort media correctly in memory to prevent TypeORM from falling back to raw LIMIT
        posts.forEach(p => {
            if (p.media && p.media.length > 1) {
                p.media.sort((a, b) => a.order - b.order);
            }
        });

        if (posts.length > 0) {
            const postIds = posts.map(p => p.id);
            const rows: { postId: string; count: string }[] = await this.postsRepository.manager
                .query(
                    `SELECT c.post_id as "postId", COUNT(c.id) as "count"
                     FROM comments c
                     LEFT JOIN comments p ON c.parent_id = p.id AND p.deleted_at IS NULL
                     WHERE c.post_id = ANY($1) AND c.deleted_at IS NULL
                       AND (c.parent_id IS NULL OR p.id IS NOT NULL)
                     GROUP BY c.post_id`,
                    [postIds],
                );
            const countMap = new Map(rows.map(r => [r.postId, parseInt(r.count, 10)]));
            posts.forEach(p => {
                (p as any).commentsCount = countMap.get(p.id) ?? 0;
            });
        }

        return posts;
    }

    async findById(id: string, cityId?: string, includeDeleted = false): Promise<Post> {
        const post = await this.postsRepository.findOne({
            where: { id, ...(cityId ? { cityId } : {}) },
            relations: ['author', 'likes', 'likes.user', 'media'],
            withDeleted: includeDeleted,
        });
        if (!post) throw new NotFoundException('Publicación no encontrada');
        if (post.media && post.media.length > 1) {
            post.media.sort((a, b) => a.order - b.order);
        }
        return post;
    }

    async countComments(postId: string): Promise<number> {
        const result = await this.postsRepository.manager.query(
            `SELECT COUNT(c.id) as "count"
             FROM comments c
             LEFT JOIN comments p ON c.parent_id = p.id AND p.deleted_at IS NULL
             WHERE c.post_id = $1 AND c.deleted_at IS NULL
               AND (c.parent_id IS NULL OR p.id IS NOT NULL)`,
            [postId],
        );
        return parseInt(result[0]?.count || '0', 10);
    }

    async searchPosts(query: string, limit: number = 5, offset: number = 0, cityId?: string): Promise<Post[]> {
        const term = `%${query}%`;
        const qb = this.postsRepository.createQueryBuilder('post')
            .leftJoinAndSelect('post.author', 'author')
            .leftJoinAndSelect('post.likes', 'likes')
            .leftJoinAndSelect('likes.user', 'likeUser')
            .leftJoinAndSelect('post.media', 'media')
            .where('post.title ILIKE :term OR post.content ILIKE :term', { term })
            .andWhere('post.deletedAt IS NULL');

        // ── Multi-tenant filter ───────────────────────────────────────────────
        if (cityId) {
            qb.andWhere('post.cityId = :cityId', { cityId });
        }

        const posts = await qb
            .orderBy('post.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();

        posts.forEach(p => {
            if (p.media && p.media.length > 1) {
                p.media.sort((a, b) => a.order - b.order);
            }
        });

        if (posts.length > 0) {
            const postIds = posts.map(p => p.id);
            const rows: { postId: string; count: string }[] = await this.postsRepository.manager
                .query(
                    `SELECT c.post_id as "postId", COUNT(c.id) as "count"
                     FROM comments c
                     LEFT JOIN comments p ON c.parent_id = p.id AND p.deleted_at IS NULL
                     WHERE c.post_id = ANY($1) AND c.deleted_at IS NULL
                       AND (c.parent_id IS NULL OR p.id IS NOT NULL)
                     GROUP BY c.post_id`,
                    [postIds],
                );
            const countMap = new Map(rows.map(r => [r.postId, parseInt(r.count, 10)]));
            posts.forEach(p => {
                (p as any).commentsCount = countMap.get(p.id) ?? 0;
            });
        }

        return posts;
    }

    async findByUser(authorId: string, limit: number = 5, offset: number = 0, cityId?: string): Promise<Post[]> {
        const query = this.postsRepository.createQueryBuilder('post')
            .where('post.authorId = :authorId', { authorId })
            .andWhere('post.deletedAt IS NULL')
            .leftJoinAndSelect('post.author', 'author')
            .leftJoinAndSelect('post.likes', 'likes')
            .leftJoinAndSelect('likes.user', 'likeUser')
            .leftJoinAndSelect('post.media', 'media');

        if (cityId) {
            query.andWhere('post.cityId = :cityId', { cityId });
        }

        const posts = await query
            .orderBy('post.createdAt', 'DESC')
            .addOrderBy('post.id', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();

        posts.forEach(p => {
            if (p.media && p.media.length > 1) {
                p.media.sort((a, b) => a.order - b.order);
            }
        });

        if (posts.length > 0) {
            const postIds = posts.map(p => p.id);
            const rows: { postId: string; count: string }[] = await this.postsRepository.manager
                .query(
                    `SELECT c.post_id as "postId", COUNT(c.id) as "count"
                     FROM comments c
                     LEFT JOIN comments p ON c.parent_id = p.id AND p.deleted_at IS NULL
                     WHERE c.post_id = ANY($1) AND c.deleted_at IS NULL
                       AND (c.parent_id IS NULL OR p.id IS NOT NULL)
                     GROUP BY c.post_id`,
                    [postIds],
                );
            const countMap = new Map(rows.map(r => [r.postId, parseInt(r.count, 10)]));
            posts.forEach(p => {
                (p as any).commentsCount = countMap.get(p.id) ?? 0;
            });
        }

        return posts;
    }

    async updatePost(id: string, content: string, userId: string, title?: string): Promise<Post> {
        const post = await this.postsRepository.findOne({ where: { id }, relations: ['author', 'likes', 'likes.user', 'comments', 'media'] });
        if (!post) {
            throw new NotFoundException('Publicación no encontrada');
        }
        if (post.authorId !== userId) {
            throw new UnauthorizedException('No puedes modificar un post que no es tuyo');
        }

        post.content = content;
        if (title !== undefined) post.title = title;
        post.editedAt = new Date(); // Marca de edición real del usuario (distinto a updatedAt del sistema)
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

    async toggleLike(postId: string, userId: string, cityId: string): Promise<Post> {
        const post = await this.postsRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('Publicación no encontrada');
        }

        const existingLike = await this.postLikesRepository.findOne({
            where: { postId, userId }
        });

        let isNewLike = false;
        if (existingLike) {
            await this.postLikesRepository.remove(existingLike);
        } else {
            const newLike = this.postLikesRepository.create({ postId, userId, cityId });
            await this.postLikesRepository.save(newLike);
            isNewLike = true;
        }

        const fullyLoadedPost = await this.postsRepository.findOne({
            where: { id: postId },
            relations: ['author', 'likes', 'likes.user', 'comments', 'media']
        });

        if (!fullyLoadedPost) {
            throw new NotFoundException('Publicación no encontrada despúes de actualizar');
        }

        if (isNewLike && fullyLoadedPost.authorId !== userId) {
            // Find the user who liked
            const likerLike = fullyLoadedPost.likes?.find(l => l.userId === userId);
            const likerUser = likerLike?.user;
            const likerName = likerUser ? `${likerUser.firstName} ${likerUser.lastName}`.trim() : 'Un usuario';
            const title = `${likerName} le dio me gusta a tu publicación`;
            const body = fullyLoadedPost.title || (fullyLoadedPost.content.length > 40 ? `${fullyLoadedPost.content.substring(0, 40)}...` : fullyLoadedPost.content) || '';
            const payload = {
                type: 'POST_DETAIL',
                postId: fullyLoadedPost.id,
                senderAvatar: likerUser?.photoUrl || null,
                senderName: likerName
            };

            // Save in-app notification in DB
            this.notificationsService.createNotification(
                fullyLoadedPost.authorId,
                title,
                body,
                NotificationType.SOCIAL,
                JSON.stringify(payload)
            ).catch(err => {
                console.error('[PostsService] Error saving in-app notification:', err);
            });

            // Send Push Notification
            this.notificationsService.sendPushNotification(
                fullyLoadedPost.authorId,
                title,
                body,
                payload
            ).catch(err => {
                console.error('[PostsService] Error sending push notification:', err);
            });
        }

        return fullyLoadedPost;
    }

    async checkIfSaved(itemId: string, userId: string, cityId: string): Promise<boolean> {
        const count = await this.savedItemsRepository.count({
            where: { itemId, userId }
        });
        return count > 0;
    }

    async toggleSaveItem(itemId: string, itemType: SavedItemType, userId: string, cityId: string): Promise<boolean> {
        const existingSave = await this.savedItemsRepository.findOne({
            where: { itemId, itemType, userId }
        });

        if (existingSave) {
            await this.savedItemsRepository.remove(existingSave);
            return false;
        } else {
            const newSave = this.savedItemsRepository.create({ itemId, itemType, userId, cityId });
            await this.savedItemsRepository.save(newSave);
            return true;
        }
    }

    async getSavedItems(userId: string, cityId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
        const savedItems = await this.savedItemsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        if (savedItems.length === 0) return [];

        const results: any[] = [];

        // Agrupar por tipo para optimizar queries si fuera necesario, 
        // pero por ahora resolveremos uno a uno para mantener el orden de guardado (DESC)
        for (const saved of savedItems) {
            let item: any = null;
            if (saved.itemType === SavedItemType.POST) {
                item = await this.postsRepository.findOne({
                    where: { id: saved.itemId },
                    relations: ['author', 'media', 'likes', 'likes.user']
                });
                if (item) {
                    item.__typename = 'Post';
                    item.isSaved = true;
                    const countRow = await this.postsRepository.manager.query(
                        'SELECT COUNT(*) as count FROM comments WHERE post_id = $1 AND deleted_at IS NULL',
                        [item.id]
                    );
                    item.commentsCount = parseInt(countRow[0].count, 10);
                }
            } else if (saved.itemType === SavedItemType.STORE_PRODUCT) {
                item = await this.storeProductsRepository.findOne({
                    where: { id: saved.itemId },
                    relations: ['seller', 'media']
                });
                if (item) {
                    item.__typename = 'StoreProduct';
                    item.isSaved = true;
                }
            } else if (saved.itemType === SavedItemType.JOB_OFFER) {
                item = await this.jobOffersRepository.findOne({
                    where: { id: saved.itemId },
                    relations: ['author', 'media']
                });
                if (item) {
                    item.__typename = 'JobOffer';
                    item.isSaved = true;
                }
            } else if (saved.itemType === SavedItemType.PROFESSIONAL_PROFILE) {
                item = await this.professionalProfilesRepository.findOne({
                    where: { id: saved.itemId }, // ProfessionalProfile doesn't have cityId yet
                    relations: ['user', 'media']
                });
                if (item) {
                    item.__typename = 'ProfessionalProfile';
                    item.isSaved = true;
                }
            }

            if (item) {
                results.push({
                    ...item,
                    __typename: saved.itemType === SavedItemType.POST ? 'Post' :
                                saved.itemType === SavedItemType.STORE_PRODUCT ? 'StoreProduct' :
                                saved.itemType === SavedItemType.JOB_OFFER ? 'JobOffer' :
                                saved.itemType === SavedItemType.PROFESSIONAL_PROFILE ? 'ProfessionalProfile' : 'Post',
                    isSaved: true
                });
            }
        }

        return results;
    }

    async getLikedItems(userId: string, cityId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
        console.log(`[PostsService] Fetching liked items for user: ${userId}`);
        
        // Query post likes
        const postLikes = await this.postLikesRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit + offset,
        });

        // Query store product likes
        const storeLikes = await this.storeProductLikesRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit + offset,
        });

        console.log(`[PostsService] Found ${postLikes.length} post likes and ${storeLikes.length} store likes`);

        // Combine and sort by createdAt
        const combined = [
            ...postLikes.map(l => ({ id: l.postId, type: 'POST', createdAt: l.createdAt })),
            ...storeLikes.map(l => ({ id: l.storeProductId, type: 'STORE_PRODUCT', createdAt: l.createdAt }))
        ].sort((a, b) => {
            const timeA = a.createdAt?.getTime() || 0;
            const timeB = b.createdAt?.getTime() || 0;
            return timeB - timeA;
        }).slice(offset, offset + limit);

        if (combined.length === 0) {
            console.log(`[PostsService] No combined likes found after slice`);
            return [];
        }

        const results: any[] = [];
        for (const item of combined) {
            let entity: any = null;
            if (item.type === 'POST') {
                entity = await this.postsRepository.findOne({
                    where: { id: item.id },
                    relations: ['author', 'media', 'likes', 'likes.user']
                });
                if (entity) {
                    entity.__typename = 'Post';
                    const countRow = await this.postsRepository.manager.query(
                        'SELECT COUNT(*) as count FROM comments WHERE post_id = $1 AND deleted_at IS NULL',
                        [entity.id]
                    );
                    entity.commentsCount = parseInt(countRow[0].count, 10);
                }
            } else if (item.type === 'STORE_PRODUCT') {
                entity = await this.storeProductsRepository.findOne({
                    where: { id: item.id },
                    relations: ['seller', 'media', 'likes', 'likes.user']
                });
                if (entity) {
                    entity.__typename = 'StoreProduct';
                }
            }

            if (entity) {
                results.push(entity);
            }
        }

        console.log(`[PostsService] Returning ${results.length} liked entities`);
        return results;
    }
}
