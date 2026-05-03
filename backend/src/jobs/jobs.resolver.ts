import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobOffer } from './entities/job-offer.entity';
import { CreateJobOfferInput } from './dto/create-job-offer.input';
import { UpdateJobOfferInput } from './dto/update-job-offer.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

import { ResolveField, Parent } from '@nestjs/graphql';
import { PostsService } from '../posts/posts.service';

@Resolver(() => JobOffer)
export class JobsResolver {
  constructor(
    private readonly jobsService: JobsService,
    private readonly postsService: PostsService,
  ) {}

  @ResolveField(() => Boolean)
  async isSaved(
    @Parent() jobOffer: JobOffer,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    if (!user) return false;
    return this.postsService.checkIfSaved(jobOffer.id, user.id, user.cityId);
  }

  @Query(() => [JobOffer], { name: 'jobOffers' })
  @UseGuards(GqlAuthGuard)
  getJobOffers(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @CurrentUser() user: any,
  ) {
    return this.jobsService.findAllJobOffers(limit, offset, user.id, user.cityId);
  }

  @Query(() => JobOffer, { name: 'getJobOfferById', nullable: true })
  @UseGuards(GqlAuthGuard)
  getJobOfferById(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ) {
    return this.jobsService.getJobOfferById(id, user.cityId);
  }

  @Query(() => [JobOffer], { name: 'myJobOffers' })
  @UseGuards(GqlAuthGuard)
  myJobOffers(@CurrentUser() user: User) {
    return this.jobsService.findMyJobOffers(user.id, user.cityId);
  }

  @Query(() => [JobOffer], { name: 'jobOffersByUser' })
  @UseGuards(GqlAuthGuard)
  jobOffersByUser(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.jobsService.findJobOffersByUser(userId, currentUser.cityId, limit, offset);
  }

  @Mutation(() => JobOffer)
  @UseGuards(GqlAuthGuard)
  createJobOffer(
    @Args('createJobOfferInput') createJobOfferInput: CreateJobOfferInput,
    @CurrentUser() user: any,
  ) {
    return this.jobsService.createJobOffer(createJobOfferInput, user.id, user.cityId);
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
