import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JobApplication } from './entities/job-application.entity';
import { ApplyToJobInput } from './dto/apply-to-job.input';
import { ApplyToJobResponse } from './dto/apply-to-job.response';
import { UpdateApplicationStatusInput } from './dto/update-application-status.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Resolver(() => JobApplication)
@UseGuards(GqlAuthGuard) // Todas las operaciones de postulaciones requieren auth
export class ApplicationsResolver {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * El candidato se postula a una oferta.
   * Retorna la aplicación creada + presigned URL para subir el PDF del CV.
   */
  @Mutation(() => ApplyToJobResponse, { name: 'applyToJob' })
  applyToJob(
    @Args('input') input: ApplyToJobInput,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.applyToJob(input, user.id);
  }

  /**
   * El empleador consulta los candidatos de una de sus ofertas.
   */
  @Query(() => [JobApplication], { name: 'jobApplications' })
  getJobApplications(
    @Args('id_job_offer', { type: () => ID }) id_job_offer: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.getJobApplications(id_job_offer, user.id);
  }

  /**
   * El candidato consulta sus propias postulaciones (pestaña "Resultados → Enviadas").
   */
  @Query(() => [JobApplication], { name: 'myApplications' })
  getMyApplications(@CurrentUser() user: User) {
    return this.applicationsService.getMyApplications(user.id);
  }

  /**
   * El empleador acepta o rechaza una postulación.
   */
  @Mutation(() => JobApplication, { name: 'updateApplicationStatus' })
  updateApplicationStatus(
    @Args('input') input: UpdateApplicationStatusInput,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.updateApplicationStatus(input, user.id);
  }
}
