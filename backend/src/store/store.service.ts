import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { StoreProduct } from './entities/store-product.entity';
import { StoreProductMedia } from './entities/store-product-media.entity';
import { StoreProductLike } from './entities/store-product-like.entity';
import { StoreProductComment } from './entities/store-product-comment.entity';
import { StoreProductCommentLike } from './entities/store-product-comment-like.entity';
import { CreateStoreProductInput } from './dto/create-store-product.input';
import { UpdateStoreProductInput } from './dto/update-store-product.input';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { UserBlock } from '../user-blocks/entities/user-block.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(StoreProduct)
    private readonly productRepo: Repository<StoreProduct>,
    @InjectRepository(StoreProductMedia)
    private readonly mediaRepo: Repository<StoreProductMedia>,
    @InjectRepository(StoreProductLike)
    private readonly likeRepo: Repository<StoreProductLike>,
    @InjectRepository(StoreProductComment)
    private readonly commentRepo: Repository<StoreProductComment>,
    @InjectRepository(StoreProductCommentLike)
    private readonly commentLikeRepo: Repository<StoreProductCommentLike>,
    private readonly userBlocksService: UserBlocksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(data: CreateStoreProductInput, userId: string, cityId: string): Promise<StoreProduct> {
    const { media, ...rest } = data;
    const product = this.productRepo.create({
      ...rest,
      sellerId: userId,
      currency: rest.currency ?? 'USD',
      cityId, // ← tenant stamp
    });
    const saved = await this.productRepo.save(product);

    // Guardar media si viene
    if (media && media.length > 0) {
      const mediaEntities = media.map((m) =>
        this.mediaRepo.create({ ...m, productId: saved.id }),
      );
      await this.mediaRepo.save(mediaEntities);
    }

    return this.productRepo.findOne({
      where: { id: saved.id },
      relations: ['seller', 'media'],
    }) as Promise<StoreProduct>;
  }

  async findAll(limit = 20, offset = 0, viewerId?: string, cityId?: string): Promise<StoreProduct[]> {
    const query = this.productRepo.createQueryBuilder('product')
      .where('product.isAvailable = true')
      .leftJoinAndSelect('product.seller', 'seller')
      .leftJoinAndSelect('product.likes', 'likes')
      .leftJoinAndSelect('likes.user', 'likeUser')
      .leftJoinAndSelect('product.media', 'media');

    // ── Multi-tenant filter ───────────────────────────────────────────────
    if (cityId) {
      query.andWhere('product.cityId = :cityId', { cityId });
    }

    if (viewerId) {
      query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('1')
          .from(UserBlock, 'ub')
          .where('ub.blockerId = :viewerId AND ub.blockedId = product.sellerId')
          .orWhere('ub.blockerId = product.sellerId AND ub.blockedId = :viewerId')
          .getQuery();
        return 'NOT EXISTS ' + subQuery;
      });
      query.setParameter('viewerId', viewerId);
    }

    return query
      .take(limit)
      .skip(offset)
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }

  async findMine(userId: string, cityId?: string): Promise<StoreProduct[]> {
    return this.productRepo.find({
      where: { sellerId: userId, cityId },
      order: { createdAt: 'DESC' },
      relations: ['seller', 'media', 'likes', 'likes.user'],
    });
  }

  async findByUser(userId: string, cityId?: string, limit = 20, offset = 0): Promise<StoreProduct[]> {
    return this.productRepo.find({
      where: { sellerId: userId, cityId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['seller', 'media', 'likes', 'likes.user'],
    });
  }

  async findById(id: string, cityId?: string): Promise<StoreProduct> {
    const product = await this.productRepo.findOne({
      where: { id, cityId },
      relations: ['seller', 'media', 'likes', 'likes.user'],
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.media) product.media.sort((a, b) => a.order - b.order);
    return product;
  }

  async update(data: UpdateStoreProductInput, userId: string): Promise<StoreProduct> {
    const product = await this.productRepo.findOne({
      where: { id: data.id },
      relations: ['media'],
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.sellerId !== userId)
      throw new ForbiddenException('Sin permiso para editar este producto');

    const { id, media, ...updates } = data;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        product[key] = updates[key];
      }
    });
    product.editedAt = new Date(); // Marca de edición real del usuario
    await this.productRepo.save(product);

    // Reemplazar media si se envía
    if (media !== undefined) {
      await this.mediaRepo.delete({ productId: id });
      if (media.length > 0) {
        const mediaEntities = media.map((m) =>
          this.mediaRepo.create({ ...m, productId: id }),
        );
        await this.mediaRepo.save(mediaEntities);
      }
    }

    return this.productRepo.findOne({
      where: { id },
      relations: ['seller', 'media'],
    }) as Promise<StoreProduct>;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (product.sellerId !== userId)
      throw new ForbiddenException('Sin permiso para eliminar este producto');
    await this.productRepo.remove(product);
    return true;
  }

  async toggleLike(productId: string, userId: string, cityId: string): Promise<StoreProduct> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const existingLike = await this.likeRepo.findOne({
      where: { storeProductId: productId, userId },
    });

    let isNewLike = false;
    if (existingLike) {
      await this.likeRepo.remove(existingLike);
    } else {
      const like = this.likeRepo.create({ storeProductId: productId, userId, cityId });
      await this.likeRepo.save(like);
      isNewLike = true;
    }

    const fullyLoadedProduct = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['seller', 'media', 'likes', 'likes.user'],
    }) as StoreProduct;

    if (!fullyLoadedProduct) {
      throw new NotFoundException('Producto no encontrado despúes de actualizar');
    }

    if (isNewLike && fullyLoadedProduct.sellerId !== userId) {
      // Find the user who liked
      const likerLike = fullyLoadedProduct.likes?.find(l => l.userId === userId);
      const likerUser = likerLike?.user;
      const likerName = likerUser ? `${likerUser.firstName} ${likerUser.lastName}`.trim() : 'Un usuario';
      const title = `${likerName} le dio me gusta a tu producto`;
      const body = fullyLoadedProduct.title;
      const payload = {
        type: 'STORE_DETAIL',
        postId: fullyLoadedProduct.id,
        image: fullyLoadedProduct.media?.[0]?.url || null,
        authorAvatarUrl: likerUser?.photoUrl || null,
        senderAvatar: likerUser?.photoUrl || null,
        senderName: likerName
      };

      // Save in-app notification in DB
      this.notificationsService.createNotification(
        fullyLoadedProduct.sellerId,
        title,
        body,
        NotificationType.SOCIAL,
        JSON.stringify(payload)
      ).catch(err => {
        console.error('[StoreService] Error saving in-app notification:', err);
      });

      // Send Push Notification
      this.notificationsService.sendPushNotification(
        fullyLoadedProduct.sellerId,
        title,
        body,
        payload
      ).catch(err => {
        console.error('[StoreService] Error sending push notification:', err);
      });
    }

    return fullyLoadedProduct;
  }

  async createComment(productId: string, userId: string, content: string, cityId: string, parentId?: string): Promise<StoreProductComment> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['media'],   // ← cargar media para obtener la imagen del producto
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const comment = this.commentRepo.create({ storeProductId: productId, userId, content, parentId, cityId });
    const saved = await this.commentRepo.save(comment);

    const result = await this.commentRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });

    // Golden rule: Do not send auto-notifications
    if (product.sellerId !== userId) {
      const commenterName = result?.user ? `${result.user.firstName} ${result.user.lastName}`.trim() : 'Un usuario';
      const title = commenterName ? `${commenterName} comentó en tu producto` : '¡Nuevo comentario en tu producto!';
      const body = content.length > 40 ? `${content.substring(0, 40)}...` : content;

      // Imagen del producto: primer media de tipo imagen
      const productImage = product.media?.find(m => m.type === 'IMAGE')?.url || null;

      const payload = {
        type: 'STORE_DETAIL',
        postId: product.id,
        image: productImage,
        authorAvatarUrl: result?.user?.photoUrl || null,
        senderAvatar: result?.user?.photoUrl || null,
        senderName: commenterName
      };

      // Save in-app notification in DB
      this.notificationsService.createNotification(
        product.sellerId,
        title,
        body,
        NotificationType.SOCIAL,
        JSON.stringify(payload)
      ).catch(err => {
        console.error('[StoreService] Error saving in-app notification:', err);
      });

      // Send Push Notification
      this.notificationsService.sendPushNotification(
        product.sellerId,
        title,
        body,
        payload
      ).catch(err => {
        console.error('[StoreService] Error sending push notification:', err);
      });
    }

    return result as StoreProductComment;
  }

  async getComments(productId: string, limit = 10, offset = 0): Promise<StoreProductComment[]> {
    return this.commentRepo.find({
      where: { storeProductId: productId, parentId: IsNull() },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['user', 'likes', 'likes.user'],
    });
  }

  async getCommentById(commentId: string): Promise<StoreProductComment | null> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: [
        'user',
        'likes',
        'likes.user',
        'product',
        'product.seller',
        'product.media',
        'product.likes',
        'product.likes.user',
        'product.author',
      ],
    });
    if (!comment) return null;
    return comment;
  }

  async getCommentReplies(commentId: string): Promise<StoreProductComment[]> {
    return this.commentRepo.find({
      where: { parentId: commentId },
      order: { createdAt: 'ASC' },
      relations: ['user', 'likes', 'likes.user'],
    });
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.userId !== userId) throw new ForbiddenException('No tienes permiso para eliminar este comentario');

    await this.commentRepo.remove(comment);
    return true;
  }

  async countComments(productId: string): Promise<number> {
    return this.commentRepo.createQueryBuilder('comment')
      .leftJoin('comment.parent', 'parent')
      .where('comment.storeProductId = :productId', { productId })
      .andWhere('(comment.parentId IS NULL OR parent.id IS NOT NULL)')
      .getCount();
  }

  async toggleCommentLike(commentId: string, userId: string, cityId: string): Promise<StoreProductComment> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentario no encontrado');

    const existing = await this.commentLikeRepo.findOne({
      where: { commentId, userId },
    });

    if (existing) {
      await this.commentLikeRepo.remove(existing);
    } else {
      const like = this.commentLikeRepo.create({ commentId, userId, cityId });
      await this.commentLikeRepo.save(like);
    }

    return this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['user', 'likes', 'likes.user'],
    }) as Promise<StoreProductComment>;
  }
}
