import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobOffer } from './entities/job-offer.entity';
import { CreateJobOfferInput } from './dto/create-job-offer.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Resolver(() => JobOffer)
export class JobsResolver {
  constructor(private readonly jobsService: JobsService) {}

  @Query(() => [JobOffer], { name: 'jobOffers' })
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.jobsService.findAllJobOffers(limit, offset);
  }

  @Mutation(() => JobOffer)
  @UseGuards(GqlAuthGuard)
  createJobOffer(
    @Args('createJobOfferInput') createJobOfferInput: CreateJobOfferInput,
    @CurrentUser() user: User,
  ) {
    return this.jobsService.createJobOffer(createJobOfferInput, user.id);
  }

  @Query(() => [JobOffer], { name: 'myJobOffers' })
  @UseGuards(GqlAuthGuard)
  myJobOffers(@CurrentUser() user: User) {
    return this.jobsService.findMyJobOffers(user.id);
  }
}
