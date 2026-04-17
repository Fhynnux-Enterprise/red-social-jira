import { Injectable, NotFoundException, ForbiddenException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { Report } from './entities/report.entity';
import { User } from '../auth/entities/user.entity';
import { CreateReportInput, ResolveReportInput } from './dto/report.input';
import { ReportStatus, ReportedItemType } from './enums/report.enums';
import { Post } from '../posts/entities/post.entity';
import { PostMedia } from '../posts/entities/post-media.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { StoreProductMedia } from '../store/entities/store-product-media.entity';
import { Comment } from '../comments/entities/comment.entity';
import { StoreProductComment } from '../store/entities/store-product-comment.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';

@Injectable()
export class ReportsService implements OnModuleInit {
    async onModuleInit() {
        try {
            const users = await this.reportRepository.query(`SELECT id FROM users`);
            const userIds = users.map((u: any) => u.id);
            
            let updated = 0;
            const reports = await this.reportRepository.find();
            for (const r of reports) {
                if (r.reportedItemType === 'POST' && userIds.includes(r.reportedItemId)) {
                    r.reportedItemType = ReportedItemType.USER;
                    r.reason = r.reason.replace(/\[REPORTE DE USUARIO\]/g, '').trim();
                    await this.reportRepository.save(r);
                    updated++;
                }
            }
            if (updated > 0) {
                console.log(`[Migration] Updated ${updated} old user reports manually.`);
            }
        } catch (e) {
            console.error('[Migration] Error executing robust migration:', e);
        }
    }

    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        @InjectRepository(Post)
        private readonly postRepository: Repository<Post>,
        @InjectRepository(PostMedia)
        private readonly postMediaRepository: Repository<PostMedia>,
        @InjectRepository(StoreProduct)
        private readonly storeProductRepository: Repository<StoreProduct>,
        @InjectRepository(StoreProductMedia)
        private readonly storeProductMediaRepository: Repository<StoreProductMedia>,
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
        @InjectRepository(StoreProductComment)
        private readonly storeProductCommentRepository: Repository<StoreProductComment>,
        @InjectRepository(JobOffer)
        private readonly jobOfferRepository: Repository<JobOffer>,
        @InjectRepository(ProfessionalProfile)
        private readonly professionalProfileRepository: Repository<ProfessionalProfile>,
    ) {}

    /**
     * Cualquier usuario autenticado puede crear una denuncia.
     * - Si ya existe un reporte PENDIENTE del mismo usuario+ítem → lanza ALREADY_REPORTED.
     * - Si el reporte previo fue RESOLVED o DISMISSED → lo reutiliza (UPSERT) actualizando
     *   reason y status a PENDING. Esto respeta el UNIQUE constraint (reporter_id, reported_item_id).
     * - Si no existe ningún reporte previo → crea uno nuevo.
     */
    async createReport(input: CreateReportInput, reporter: User): Promise<Report> {
        // Buscar cualquier reporte previo del mismo usuario sobre el mismo ítem
        const existing = await this.reportRepository.findOne({
            where: {
                reportedItemId: input.reportedItemId,
                reporter: { id: reporter.id },
            },
        });

        if (existing) {
            if (existing.status === ReportStatus.PENDING) {
                // Ya hay uno pendiente → no permitir duplicado
                throw new ConflictException('ALREADY_REPORTED');
            }

            // RESOLVED o DISMISSED → reutilizar el registro (UPSERT)
            existing.reason = input.reason;
            existing.status = ReportStatus.PENDING;
            existing.moderatorNote = null as any;
            existing.contentDeleted = false;
            existing.createdAt = new Date(); // Actualizamos la fecha para que flote al tope
            return this.reportRepository.save(existing);
        }

        // No existe previo → insertar uno nuevo
        const report = this.reportRepository.create({
            reason: input.reason,
            reportedItemId: input.reportedItemId,
            reportedItemType: input.reportedItemType,
            reporter,
        });

        return this.reportRepository.save(report);
    }

    /**
     * Devuelve todas las denuncias con estado PENDING.
     */
    async getPendingReports(limit = 20, offset = 0): Promise<Report[]> {
        const reports = await this.reportRepository.createQueryBuilder('report')
            .leftJoinAndSelect('report.reporter', 'reporter')
            .where('report.status = :status', { status: ReportStatus.PENDING })
            .orderBy('report.createdAt', 'DESC', 'NULLS LAST')
            .take(limit)
            .skip(offset)
            .getMany();
        return reports;
    }

    /**
     * Devuelve todos los reportes. Solo para ADMIN.
     */
    async getAllReports(limit = 20, offset = 0): Promise<Report[]> {
        const reports = await this.reportRepository.createQueryBuilder('report')
            .leftJoinAndSelect('report.reporter', 'reporter')
            .orderBy('report.createdAt', 'DESC', 'NULLS LAST')
            .take(limit)
            .skip(offset)
            .getMany();
        return reports;
    }

    /**
     * Resuelve una denuncia y opcionalmente hace soft-delete del contenido.
     * Cuando deleteContent=true, NO se borra el archivo de Cloudflare R2.
     * Solo se marca el registro como eliminado (soft-delete) en la BD.
     */
    async resolveReport(input: ResolveReportInput): Promise<Report> {
        const report = await this.reportRepository.findOne({
            where: { id: input.reportId },
            relations: ['reporter'],
        });

        if (!report) {
            throw new NotFoundException(`Denuncia con ID ${input.reportId} no encontrada.`);
        }

        if (report.status !== ReportStatus.PENDING) {
            throw new ForbiddenException('Esta denuncia ya fue procesada.');
        }

        // 1. Obtener todas las denuncias PENDIENTES del mismo ítem
        const relatedReports = await this.reportRepository.find({
            where: { reportedItemId: report.reportedItemId, status: ReportStatus.PENDING },
        });

        // 2. Si se solicitó borrar el contenido, ejecutamos el borrado real (soft-delete)
        let didDelete = false;
        if (input.deleteContent) {
            await this.softDeleteContent(report.reportedItemType, report.reportedItemId);
            didDelete = true;
        }

        // 3. Actualizar la denuncia original (la que se está resolviendo)
        report.status = ReportStatus.RESOLVED;
        report.moderatorNote = input.moderatorNote;
        report.contentDeleted = didDelete;
        const resolvedReport = await this.reportRepository.save(report);

        // 4. Actualizar TODAS las demás denuncias pendientes del mismo ítem
        for (const related of relatedReports) {
            if (related.id !== report.id) {
                related.status = ReportStatus.RESOLVED;
                related.moderatorNote = `[Resuelto en conjunto] ${input.moderatorNote || ''}`.trim();
                related.contentDeleted = didDelete;
                await this.reportRepository.save(related);
            }
        }

        return resolvedReport;
    }

    /**
     * Moderación directa: Elimina el contenido inmediatamente y crea una denuncia "RESUELTA" para el registro.
     */
    async directModerateContent(input: any, moderator: User): Promise<Report> {
        // 1. Ejecutar el soft delete / hard delete según el tipo
        await this.softDeleteContent(input.reportedItemType, input.reportedItemId);

        // 2. Upsert del reporte de auditoría:
        //    Si el moderador ya tenía un reporte previo del mismo ítem, lo actualizamos.
        //    De lo contrario, creamos uno nuevo. Esto evita violar el constraint UNIQUE.
        let auditReport = await this.reportRepository.findOne({
            where: {
                reportedItemId: input.reportedItemId,
                reporter: { id: moderator.id },
            },
        });

        if (auditReport) {
            // Actualizar el reporte existente como resuelto
            auditReport.status = ReportStatus.RESOLVED;
            auditReport.moderatorNote = input.moderatorNote || 'Eliminado por moderador.';
            auditReport.contentDeleted = true;
        } else {
            // Crear un nuevo reporte de auditoría
            auditReport = this.reportRepository.create({
                reason: 'Moderación directa',
                status: ReportStatus.RESOLVED,
                reportedItemId: input.reportedItemId,
                reportedItemType: input.reportedItemType,
                reporter: moderator,
                moderatorNote: input.moderatorNote || 'Eliminado por moderador.',
                contentDeleted: true,
            });
        }

        const savedReport = await this.reportRepository.save(auditReport);

        // 3. Marcar todas las demás denuncias PENDIENTES del mismo ítem como resueltas
        const relatedReports = await this.reportRepository.find({
            where: { reportedItemId: input.reportedItemId, status: ReportStatus.PENDING },
        });

        for (const related of relatedReports) {
            if (related.id !== savedReport.id) {
                related.status = ReportStatus.RESOLVED;
                related.moderatorNote = `[Resuelto en moderación directa] ${input.moderatorNote || ''}`.trim();
                related.contentDeleted = true;
                await this.reportRepository.save(related);
            }
        }

        return savedReport;
    }

    /**
     * Hace un soft-delete directo vía QueryBuilder UPDATE.
     * NO dispara el TypeORM subscriber (no borra R2).
     * NO usa cascade (sin riesgo de doble borrado).
     */
    private async softDeleteContent(
        type: ReportedItemType,
        itemId: string,
    ): Promise<void> {
        const now = new Date();

        if (type === ReportedItemType.POST) {
            // 1. Soft-delete de los media del post (sin tocar R2)
            await this.postMediaRepository
                .createQueryBuilder()
                .update()
                .set({ deletedAt: now } as any)
                .where('post_id = :postId AND deleted_at IS NULL', { postId: itemId })
                .execute();

            // 2. Soft-delete del post
            await this.postRepository
                .createQueryBuilder()
                .update()
                .set({ deletedAt: now } as any)
                .where('id = :id AND deleted_at IS NULL', { id: itemId })
                .execute();

            console.log(`[Moderation] POST ${itemId} soft-deleted (R2 intacto).`);

        } else if (type === ReportedItemType.PRODUCT) {
            // 1. Soft-delete de los media del producto (sin tocar R2)
            await this.storeProductMediaRepository
                .createQueryBuilder()
                .update()
                .set({ deletedAt: now } as any)
                .where('product_id = :productId AND deleted_at IS NULL', { productId: itemId })
                .execute();

            // 2. Soft-delete del producto
            await this.storeProductRepository
                .createQueryBuilder()
                .update()
                .set({ deletedAt: now } as any)
                .where('id = :id AND deleted_at IS NULL', { id: itemId })
                .execute();

            console.log(`[Moderation] PRODUCT ${itemId} soft-deleted (R2 intacto).`);
        } else if (type === ReportedItemType.COMMENT) {
            // 1. Identificar si es comentario de post o de producto
            const postComment = await this.commentRepository.findOne({ where: { id: itemId } });
            if (postComment) {
                // Eliminar respuestas (hijos) primero, luego el comentario raíz
                await this.commentRepository.delete({ parentId: itemId });
                await this.commentRepository.delete({ id: itemId });
                console.log(`[Moderation] Post Comment ${itemId} + replies hard-deleted.`);
            } else {
                // Buscar en comentarios de tienda
                const storeComment = await this.storeProductCommentRepository.findOne({ where: { id: itemId } });
                if (storeComment) {
                    await this.storeProductCommentRepository.delete({ parentId: itemId });
                    await this.storeProductCommentRepository.delete({ id: itemId });
                    console.log(`[Moderation] StoreProduct Comment ${itemId} + replies hard-deleted.`);
                }
            }
        } else if (type === ReportedItemType.JOB_OFFER) {
            // Hard-delete: JobOffer no tiene soft-delete column
            await this.jobOfferRepository.delete({ id: itemId });
            console.log(`[Moderation] JOB_OFFER ${itemId} hard-deleted.`);

        } else if (type === ReportedItemType.SERVICE) {
            // Hard-delete: ProfessionalProfile no tiene soft-delete column
            await this.professionalProfileRepository.delete({ id: itemId });
            console.log(`[Moderation] SERVICE (ProfessionalProfile) ${itemId} hard-deleted.`);
        }
    }

    /**
     * Descarta una denuncia sin acción sobre el contenido.
     */
    async dismissReport(reportId: string, moderatorNote?: string): Promise<Report> {
        const report = await this.reportRepository.findOne({
            where: { id: reportId },
            relations: ['reporter'],
        });

        if (!report) {
            throw new NotFoundException(`Denuncia con ID ${reportId} no encontrada.`);
        }

        report.status = ReportStatus.DISMISSED;
        if (moderatorNote) report.moderatorNote = moderatorNote;

        return this.reportRepository.save(report);
    }

    /**
     * Devuelve el reporte PENDIENTE del usuario actual para un ítem dado.
     * Retorna null si no hay ningún reporte pendiente (nunca reportó, o fue resuelto/descartado).
     * Con null el frontend permitirá denunciar de nuevo.
     */
    async getMyReportForItem(reportedItemId: string, reporter: User): Promise<Report | null> {
        return this.reportRepository.findOne({
            where: {
                reportedItemId,
                reporter: { id: reporter.id },
                status: ReportStatus.PENDING,
            },
            order: { createdAt: 'DESC' },
        });
    }
}

