import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appeal } from './entities/appeal.entity';
import { CreateAppealInput, ResolveAppealInput } from './dto/appeal.input';
import { AppealStatus, AppealType } from './enums/appeal.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';
import { Post } from '../posts/entities/post.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';
import { User } from '../auth/entities/user.entity';

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
        // Prevent multiple pending appeals for the same reference
        if (input.referenceId) {
            const existing = await this.appealRepository.findOne({
                where: { userId, referenceId: input.referenceId, status: AppealStatus.PENDING }
            });
            if (existing) {
                throw new BadRequestException('Ya tienes una apelación pendiente para este contenido.');
            }
        } else {
            // If it's an account ban appeal without referenceId, check if one exists already
            if (input.type === AppealType.ACCOUNT_BAN) {
                const existing = await this.appealRepository.findOne({
                    where: { userId, type: AppealType.ACCOUNT_BAN, status: AppealStatus.PENDING }
                });
                if (existing) {
                    throw new BadRequestException('Ya tienes una apelación pendiente para tu cuenta.');
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
                    await transactionalEntityManager.restore(StoreProduct, { id: appeal.referenceId });
                    await transactionalEntityManager.restore(JobOffer, { id: appeal.referenceId });
                    await transactionalEntityManager.restore(ProfessionalProfile, { id: appeal.referenceId });
                } else if (appeal.type === AppealType.ACCOUNT_BAN) {
                    // Unban user
                    await transactionalEntityManager
                        .createQueryBuilder()
                        .update(User)
                        .set({ bannedUntil: () => 'NULL', banReason: () => 'NULL' })
                        .where('id = :id', { id: appeal.userId })
                        .execute();
                    
                    // Restaurar contenido si es necesario (asumiendo que fue borrado con wipeContent)
                    // Para ser seguros, restauramos.
                    await transactionalEntityManager.restore(Post, { authorId: appeal.userId });
                    await transactionalEntityManager.restore(StoreProduct, { sellerId: appeal.userId });
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

            // Using notificationsService.createNotification is usually outside transaction unless injected with queryRunner.
            // For simplicity, doing it here might not be transactional but it's fine for notification.
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
        await this.notificationsService.createNotification(appeal.userId, title, message, NotificationType.SYSTEM);

        return appeal;
    }
}
