import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { User } from '../auth/entities/user.entity';
import { CreateReportInput, ResolveReportInput } from './dto/report.input';
import { ReportStatus, ReportedItemType } from './enums/report.enums';
import { Post } from '../posts/entities/post.entity';
import { PostMedia } from '../posts/entities/post-media.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { StoreProductMedia } from '../store/entities/store-product-media.entity';

@Injectable()
export class ReportsService {
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
    ) {}

    /**
     * Cualquier usuario autenticado puede crear una denuncia.
     * Se valida que no haya duplicados (mismo usuario, mismo ítem).
     */
    async createReport(input: CreateReportInput, reporter: User): Promise<Report> {
        const existing = await this.reportRepository.findOne({
            where: {
                reportedItemId: input.reportedItemId,
                reporter: { id: reporter.id },
            },
        });

        if (existing) {
            throw new ForbiddenException('Ya has denunciado este contenido anteriormente.');
        }

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
        return this.reportRepository.find({
            where: { status: ReportStatus.PENDING },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['reporter'],
        });
    }

    /**
     * Devuelve todos los reportes. Solo para ADMIN.
     */
    async getAllReports(limit = 20, offset = 0): Promise<Report[]> {
        return this.reportRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['reporter'],
        });
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
        // 1. Ejecutar el soft delete
        await this.softDeleteContent(input.reportedItemType, input.reportedItemId);

        // 2. Crear una denuncia ya resuelta a nombre del moderador para dejar registro
        const report = this.reportRepository.create({
            reason: 'Moderación directa desde el feed',
            status: ReportStatus.RESOLVED,
            reportedItemId: input.reportedItemId,
            reportedItemType: input.reportedItemType,
            reporter: moderator,
            moderatorNote: input.moderatorNote || 'Acción rápida de moderador.',
            contentDeleted: true,
        });

        const savedReport = await this.reportRepository.save(report);

        // 3. Obtener y marcar posibles denuncias previas pendientes
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
        }
        // JOB_OFFER, SERVICE, COMMENT: se puede extender aquí en el futuro.
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
}
