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

  @Query(() => [ProfessionalProfile], { name: 'myProfessionalProfile' })
  @UseGuards(GqlAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    const profile = await this.professionalsService.findOneByUserId(user.id);
    return profile ? [profile] : [];
  }

  @Mutation(() => ProfessionalProfile)
  @UseGuards(GqlAuthGuard)
  upsertProfessionalProfile(
    @Args('upsertProfessionalProfileInput') input: UpsertProfessionalProfileInput,
    @CurrentUser() user: User,
  ) {
    return this.professionalsService.upsertProfessionalProfile(input, user.id);
  }
}
