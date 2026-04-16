import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobOffer } from './entities/job-offer.entity';
import { CreateJobOfferInput } from './dto/create-job-offer.input';
import { UpdateJobOfferInput } from './dto/update-job-offer.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Resolver(() => JobOffer)
export class JobsResolver {
  constructor(private readonly jobsService: JobsService) {}

  @Query(() => [JobOffer], { name: 'jobOffers' })
  @UseGuards(GqlAuthGuard)
  getJobOffers(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.jobsService.findAllJobOffers(limit, offset);
  }

  @Query(() => JobOffer, { name: 'getJobOfferById', nullable: true })
  @UseGuards(GqlAuthGuard)
  getJobOfferById(@Args('id', { type: () => ID }) id: string) {
    return this.jobsService.getJobOfferById(id);
  }

  @Query(() => [JobOffer], { name: 'myJobOffers' })
  @UseGuards(GqlAuthGuard)
  myJobOffers(@CurrentUser() user: User) {
    return this.jobsService.findMyJobOffers(user.id);
  }

  @Query(() => [JobOffer], { name: 'jobOffersByUser' })
  @UseGuards(GqlAuthGuard)
  jobOffersByUser(@Args('userId', { type: () => ID }) userId: string) {
    return this.jobsService.findJobOffersByUser(userId);
  }

  @Mutation(() => JobOffer)
  @UseGuards(GqlAuthGuard)
  createJobOffer(
    @Args('createJobOfferInput') createJobOfferInput: CreateJobOfferInput,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.createJobOffer(createJobOfferInput, user.id);
  }

  @Mutation(() => JobOffer)
  @UseGuards(GqlAuthGuard)
  updateJobOffer(
    @Args('input') input: UpdateJobOfferInput,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.updateJobOffer(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  deleteJobOffer(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.deleteJobOffer(id, user.id);
  }
}
