import { Resolver, Mutation, Query, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Report } from './entities/report.entity';
import { CreateReportInput, ResolveReportInput, DirectModerateInput } from './dto/report.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { User } from '../auth/entities/user.entity';

@Resolver(() => Report)
export class ReportsResolver {
    constructor(private readonly reportsService: ReportsService) {}

    /**
     * Cualquier usuario autenticado puede denunciar contenido.
     */
    @Mutation(() => Report)
    @UseGuards(GqlAuthGuard)
    createReport(
        @Args('input') input: CreateReportInput,
        @CurrentUser() user: User,
    ): Promise<Report> {
        return this.reportsService.createReport(input, user);
    }

    /**
     * Solo ADMIN y MODERATOR pueden ver las denuncias pendientes.
     */
    @Query(() => [Report], { name: 'getPendingReports' })
    @UseGuards(GqlAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    getPendingReports(
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    ): Promise<Report[]> {
        return this.reportsService.getPendingReports(limit, offset);
    }

    /**
     * Solo ADMIN y MODERATOR pueden ver todas las denuncias (incluyendo resueltas/descartadas).
     */
    @Query(() => [Report], { name: 'getAllReports' })
    @UseGuards(GqlAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    getAllReports(
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    ): Promise<Report[]> {
        return this.reportsService.getAllReports(limit, offset);
    }

    /**
     * Resolver o cerrar una denuncia. Solo ADMIN y MODERATOR.
     */
    @Mutation(() => Report)
    @UseGuards(GqlAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    resolveReport(
        @Args('input') input: ResolveReportInput,
    ): Promise<Report> {
        console.log(`[ReportsResolver] resolveReport called: reportId=${input.reportId}, deleteContent=${input.deleteContent}, note=${input.moderatorNote}`);
        return this.reportsService.resolveReport(input);
    }

    /**
     * Descartar una denuncia sin acción. Solo ADMIN y MODERATOR.
     */
    @Mutation(() => Report)
    @UseGuards(GqlAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    dismissReport(
        @Args('reportId', { type: () => ID }) reportId: string,
        @Args('moderatorNote', { nullable: true }) moderatorNote?: string,
    ): Promise<Report> {
        return this.reportsService.dismissReport(reportId, moderatorNote);
    }

    /**
     * Moderación directa desde el feed (elimina y deja registro en moderación). Solo ADMIN y MODERATOR.
     */
    @Mutation(() => Report)
    @UseGuards(GqlAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    directModerateContent(
        @Args('input') input: DirectModerateInput,
        @CurrentUser() user: User,
    ): Promise<Report> {
        return this.reportsService.directModerateContent(input, user);
    }

    /**
     * Devuelve el reporte más reciente del usuario actual para un ítem dado.
     * Retorna null si no existe ningún reporte previo.
     * Si el status es PENDING: el usuario ya reportó y sigue pendiente.
     * Si el status es RESOLVED o DISMISSED: puede reportar de nuevo.
     */
    @Query(() => Report, { nullable: true, name: 'getMyReportStatus' })
    @UseGuards(GqlAuthGuard)
    getMyReportStatus(
        @Args('reportedItemId', { type: () => ID }) reportedItemId: string,
        @CurrentUser() user: User,
    ): Promise<Report | null> {
        return this.reportsService.getMyReportForItem(reportedItemId, user);
    }
}
