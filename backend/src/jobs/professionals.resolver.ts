import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { UpsertProfessionalProfileInput } from './dto/upsert-professional-profile.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Resolver(() => ProfessionalProfile)
export class ProfessionalsResolver {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Query(() => [ProfessionalProfile], { name: 'professionalProfiles' })
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.professionalsService.findAllProfessionals(limit, offset);
  }

  @Query(() => ProfessionalProfile, { name: 'getProfessionalProfileById', nullable: true })
  findById(@Args('id') id: string) {
    return this.professionalsService.findOneById(id);
  }

  @Query(() => [ProfessionalProfile], { name: 'professionalProfilesByUser' })
  findAllByUser(@Args('userId') userId: string) {
    return this.professionalsService.findAllByUserId(userId);
  }

  @Query(() => [ProfessionalProfile], { name: 'myProfessionalProfile' })
  @UseGuards(GqlAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return this.professionalsService.findAllByUserId(user.id);
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
