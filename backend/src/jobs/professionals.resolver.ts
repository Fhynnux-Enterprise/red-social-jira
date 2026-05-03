import { Resolver, Query, Mutation, Args, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { UpsertProfessionalProfileInput } from './dto/upsert-professional-profile.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { PostsService } from '../posts/posts.service';

@Resolver(() => ProfessionalProfile)
export class ProfessionalsResolver {
  constructor(
    private readonly professionalsService: ProfessionalsService,
    private readonly postsService: PostsService,
  ) {}

  @ResolveField(() => Boolean)
  async isSaved(
    @Parent() profile: ProfessionalProfile,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    if (!user) return false;
    return this.postsService.checkIfSaved(profile.id, user.id, user.cityId);
  }

  @Query(() => [ProfessionalProfile], { name: 'professionalProfiles' })
  @UseGuards(GqlAuthGuard)
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @CurrentUser() user: any,
  ) {
    return this.professionalsService.findAllProfessionals(limit, offset, user.id, user.cityId);
  }

  @Query(() => ProfessionalProfile, { name: 'getProfessionalProfileById', nullable: true })
  @UseGuards(GqlAuthGuard)
  findById(@Args('id') id: string, @CurrentUser() user: any) {
    return this.professionalsService.findOneById(id, user.cityId);
  }

  @Query(() => [ProfessionalProfile], { name: 'professionalProfilesByUser' })
  @UseGuards(GqlAuthGuard)
  findAllByUser(
    @Args('userId') userId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @CurrentUser() user: any
  ) {
    return this.professionalsService.findAllByUserId(userId, user.cityId, limit, offset);
  }

  @Query(() => [ProfessionalProfile], { name: 'myProfessionalProfile' })
  @UseGuards(GqlAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return this.professionalsService.findAllByUserId(user.id, user.cityId);
  }

  @Mutation(() => ProfessionalProfile)
  @UseGuards(GqlAuthGuard)
  upsertProfessionalProfile(
    @Args('upsertProfessionalProfileInput') input: UpsertProfessionalProfileInput,
    @CurrentUser() user: User,
  ) {
    return this.professionalsService.upsertProfessionalProfile(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  deleteProfessionalProfile(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.professionalsService.deleteProfessionalProfile(id, user.id);
  }

  @Mutation(() => ProfessionalProfile)
  @UseGuards(GqlAuthGuard)
  updateProfessionalProfile(
    @Args('id') id: string,
    @Args('input') input: UpsertProfessionalProfileInput,
    @CurrentUser() user: User,
  ) {
    return this.professionalsService.updateProfessionalProfile(id, input, user.id);
  }
}
