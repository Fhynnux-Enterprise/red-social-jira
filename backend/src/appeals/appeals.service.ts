import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appeal } from './entities/appeal.entity';
import { CreateAppealInput, ResolveAppealInput } from './dto/appeal.input';
import { AppealStatus, AppealType } from './enums/appeal.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';
import { Post } from '../posts/entities/post.entity';
import { PostMedia } from '../posts/entities/post-media.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { StoreProductMedia } from '../store/entities/store-product-media.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Comment } from '../comments/entities/comment.entity';
import { StoreProductComment } from '../store/entities/store-product-comment.entity';

@Injectable()
export class AppealsService {
    constructor(
        @InjectRepository(Appeal)
        private readonly appealRepository: Repository<Appeal>,
        private readonly notificationsService: NotificationsService,
        @InjectRepository(Post)
        private readonly postRepository: Repository<Post>,
        @InjectRepository(StoreProduct)
        private readonly storeProductRepository: Repository<StoreProduct>,
        @InjectRepository(JobOffer)
        private readonly jobOfferRepository: Repository<JobOffer>,
        @InjectRepository(ProfessionalProfile)
        private readonly professionalProfileRepository: Repository<ProfessionalProfile>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async createAppeal(userId: string, input: CreateAppealInput): Promise<Appeal> {
        // Prevent multiple appeals for the same reference
        if (input.referenceId) {
            const existing = await this.appealRepository.findOne({
                where: { userId, referenceId: input.referenceId },
                order: { createdAt: 'DESC' }
            });
            if (existing) {
                if (existing.status === AppealStatus.PENDING) {
                    throw new BadRequestException('Ya tienes una apelación pendiente para este contenido.');
                } else if (existing.status === AppealStatus.REJECTED) {
                    throw new BadRequestException('Ya se ha procesado una apelación para este contenido y la decisión es final.');
                }
                // If it was APPROVED, we allow a new appeal because the post was restored and deleted again
            }
        } else {
            // If it's an account ban appeal without referenceId, check if one exists already
            if (input.type === AppealType.ACCOUNT_BAN) {
                const existing = await this.appealRepository.findOne({
                    where: { userId, type: AppealType.ACCOUNT_BAN },
                    order: { createdAt: 'DESC' }
                });
                if (existing) {
                    if (existing.status === AppealStatus.PENDING) {
                        throw new BadRequestException('Ya tienes una apelación pendiente para tu cuenta.');
                    } else if (existing.status === AppealStatus.REJECTED) {
                        throw new BadRequestException('Ya se ha procesado una apelación para tu cuenta y la decisión es final.');
                    }
                    // If it was APPROVED, they were unbanned and banned again, so we allow a new appeal
                }
            }
        }

        const appeal = this.appealRepository.create({
            userId,
            reason: input.reason,
            type: input.type,
            referenceId: input.referenceId,
            status: AppealStatus.PENDING,
        });

        return this.appealRepository.save(appeal);
    }

    async getPendingAppeals(limit = 20, offset = 0): Promise<Appeal[]> {
        return this.appealRepository.find({
            where: { status: AppealStatus.PENDING },
            order: { createdAt: 'ASC' },
            take: limit,
            skip: offset,
            relations: ['user']
        });
    }

    async resolveAppeal(input: ResolveAppealInput, moderator: User): Promise<Appeal> {
        const appeal = await this.appealRepository.findOne({
            where: { id: input.appealId },
            relations: ['user']
        });

        if (!appeal) {
            throw new NotFoundException('Apelación no encontrada.');
        }

        if (appeal.status !== AppealStatus.PENDING) {
            throw new BadRequestException('Esta apelación ya fue resuelta.');
        }

        appeal.status = input.approve ? AppealStatus.APPROVED : AppealStatus.REJECTED;
        
        await this.appealRepository.manager.transaction(async transactionalEntityManager => {
            await transactionalEntityManager.save(appeal);

            if (input.approve) {
                if (appeal.type === AppealType.CONTENT_DELETION && appeal.referenceId) {
                    // Intentar hacer un-delete en las entidades principales
                    await transactionalEntityManager.restore(Post, { id: appeal.referenceId });
                    await transactionalEntityManager
                        .createQueryBuilder()
                        .update(PostMedia)
                        .set({ deletedAt: null })
                        .where('post_id = :postId', { postId: appeal.referenceId })
                        .execute();

                    await transactionalEntityManager.restore(StoreProduct, { id: appeal.referenceId });
                    await transactionalEntityManager
                        .createQueryBuilder()
                        .update(StoreProductMedia)
                        .set({ deletedAt: null })
                        .where('product_id = :productId', { productId: appeal.referenceId })
                        .execute();

                    await transactionalEntityManager.restore(JobOffer, { id: appeal.referenceId });
                    await transactionalEntityManager.restore(ProfessionalProfile, { id: appeal.referenceId });
                    await transactionalEntityManager.restore(Comment, { id: appeal.referenceId });
                    await transactionalEntityManager.restore(StoreProductComment, { id: appeal.referenceId });
                } else if (appeal.type === AppealType.ACCOUNT_BAN) {
                    // Unban user
                    await transactionalEntityManager
                        .createQueryBuilder()
                        .update(User)
                        .set({ bannedUntil: () => 'NULL', banReason: () => 'NULL' })
                        .where('id = :id', { id: appeal.userId })
                        .execute();
                    
                    // Restaurar contenido si es necesario (asumiendo que fue borrado con wipeContent)
                    await transactionalEntityManager.restore(Post, { authorId: appeal.userId });
                    await transactionalEntityManager
                        .createQueryBuilder()
                        .update(PostMedia)
                        .set({ deletedAt: null })
                        .where('post_id IN (SELECT id FROM posts WHERE user_id = :userId)', { userId: appeal.userId })
                        .execute();

                    await transactionalEntityManager.restore(StoreProduct, { sellerId: appeal.userId });
                    await transactionalEntityManager
                        .createQueryBuilder()
                        .update(StoreProductMedia)
                        .set({ deletedAt: null })
                        .where('product_id IN (SELECT id FROM store_products WHERE seller_id = :userId)', { userId: appeal.userId })
                        .execute();

                    await transactionalEntityManager.restore(JobOffer, { authorId: appeal.userId });
                    await transactionalEntityManager.restore(ProfessionalProfile, { userId: appeal.userId });
                }
            }

            // Notificar al usuario sobre la resolución
            const statusText = input.approve ? 'APROBADA' : 'DENEGADA';
            const title = `Actualización de tu Apelación`;
            let message = `Tu apelación ha sido ${statusText}. `;
            if (input.approve) {
                if (appeal.type === AppealType.CONTENT_DELETION) {
                    message += 'Tu contenido ha sido restaurado y ya está visible nuevamente.';
                } else {
                    message += 'Tu cuenta ha sido desbaneada y el contenido restaurado.';
                }
            } else {
                message += 'La decisión original se mantiene. Por favor, revisa nuestras normas comunitarias.';
            }
        });

        // Outside transaction to ensure it uses its own context if needed
        const statusText = input.approve ? 'APROBADA' : 'DENEGADA';
        const title = `Actualización de tu Apelación`;
        let message = `Tu apelación ha sido ${statusText}. `;
        if (input.approve) {
            if (appeal.type === AppealType.CONTENT_DELETION) {
                message += 'Tu contenido ha sido restaurado y ya está visible nuevamente.';
            } else {
                message += 'Tu cuenta ha sido desbaneada y el contenido restaurado.';
            }
        } else {
            message += 'La decisión original se mantiene. Por favor, revisa nuestras normas comunitarias.';
        }

        let payloadStr: string | undefined = undefined;
        let payloadObj: any = null;
        if (input.approve && appeal.type === AppealType.CONTENT_DELETION && appeal.referenceId) {
            const cType = await this.getContentType(appeal);
            if (cType) {
                const finalType = cType === 'STORE_COMMENT_DETAIL' ? 'COMMENT_DETAIL' : cType;
                payloadObj = {
                    type: finalType,
                    postId: appeal.referenceId,
                    isDeletedContent: 'false',
                    isStore: cType === 'STORE_COMMENT_DETAIL' ? 'true' : 'false',
                };
                payloadStr = JSON.stringify(payloadObj);
            }
        }

        await this.notificationsService.createNotification(
            appeal.userId,
            title,
            message,
            NotificationType.SYSTEM,
            payloadStr
        );

        if (payloadObj) {
            await this.notificationsService.sendPushNotification(
                appeal.userId,
                title,
                message,
                payloadObj,
                { categoryId: 'system' }
            ).catch(err => console.error('Error sending system push notification for resolved appeal:', err));
        }

        return appeal;
    }

    async getContentType(appeal: Appeal): Promise<string | null> {
        if (!appeal.referenceId) return null;

        // Check Comment
        const commentRepo = this.postRepository.manager.getRepository(Comment);
        const commentExists = await commentRepo.findOne({
            where: { id: appeal.referenceId },
            withDeleted: true
        });
        if (commentExists) return 'COMMENT_DETAIL';

        // Check StoreProductComment
        const storeCommentRepo = this.postRepository.manager.getRepository(StoreProductComment);
        const storeCommentExists = await storeCommentRepo.findOne({
            where: { id: appeal.referenceId },
            withDeleted: true
        });
        if (storeCommentExists) return 'STORE_COMMENT_DETAIL';

        // Check Post
        const postExists = await this.postRepository.findOne({
            where: { id: appeal.referenceId },
            withDeleted: true
        });
        if (postExists) return 'POST_DETAIL';

        // Check StoreProduct
        const productExists = await this.storeProductRepository.findOne({
            where: { id: appeal.referenceId },
            withDeleted: true
        });
        if (productExists) return 'STORE_DETAIL';

        // Check JobOffer
        const jobExists = await this.jobOfferRepository.findOne({
            where: { id: appeal.referenceId }
        });
        if (jobExists) return 'JOB_DETAIL';

        // Check ProfessionalProfile
        const profileExists = await this.professionalProfileRepository.findOne({
            where: { id: appeal.referenceId }
        });
        if (profileExists) return 'SERVICE_DETAIL';

        return null;
    }
}
