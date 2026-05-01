import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { AdvertisersService } from './advertisers.service';
import { AdvertiserPermission } from './entities/advertiser-permission.entity';
import { LocalAd } from './entities/local-ad.entity';
import { GrantAdvertiserInput, UpdateAdvertiserPermissionInput, CreateLocalAdInput, UpdateLocalAdInput } from './dto/advertiser.input';

@Resolver()
export class AdvertisersResolver {
  constructor(private readonly advertisersService: AdvertisersService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────────

  @Query(() => [AdvertiserPermission], { name: 'getAdvertiserPermissions' })
  @UseGuards(GqlAuthGuard)
  async getAdvertiserPermissions(
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
  ): Promise<AdvertiserPermission[]> {
    return this.advertisersService.getAllPermissions(search, limit, offset);
  }

  @Query(() => [LocalAd], { name: 'getAllLocalAds' })
  @UseGuards(GqlAuthGuard)
  async getAllLocalAds(): Promise<LocalAd[]> {
    return this.advertisersService.getAllLocalAds();
  }

  @Query(() => [LocalAd], { name: 'getAdvertiserAds' })
  @UseGuards(GqlAuthGuard)
  async getAdvertiserAds(@Args('userId') userId: string): Promise<LocalAd[]> {
    return this.advertisersService.getAdsByAdvertiser(userId);
  }

  @Query(() => Boolean, { name: 'hasAdvertiserPermission' })
  @UseGuards(GqlAuthGuard)
  async hasAdvertiserPermission(
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.advertisersService.hasActivePermission(user.id);
  }

  @Query(() => AdvertiserPermission, { name: 'getMyAdvertiserPermission', nullable: true })
  @UseGuards(GqlAuthGuard)
  async getMyAdvertiserPermission(@CurrentUser() user: User): Promise<AdvertiserPermission | null> {
    return this.advertisersService.getMyPermission(user.id);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  @Mutation(() => AdvertiserPermission, { name: 'grantAdvertiserPermission' })
  @UseGuards(GqlAuthGuard)
  async grantAdvertiserPermission(
    @Args('input') input: GrantAdvertiserInput,
    @CurrentUser() admin: User,
  ): Promise<AdvertiserPermission> {
    return this.advertisersService.grantPermission(input, admin.id);
  }

  @Mutation(() => AdvertiserPermission, { name: 'updateAdvertiserPermission' })
  @UseGuards(GqlAuthGuard)
  async updateAdvertiserPermission(
    @Args('input') input: UpdateAdvertiserPermissionInput,
  ): Promise<AdvertiserPermission> {
    return this.advertisersService.updatePermission(input);
  }

  @Mutation(() => Boolean, { name: 'revokeAdvertiserPermission' })
  @UseGuards(GqlAuthGuard)
  async revokeAdvertiserPermission(
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.advertisersService.revokePermission(id);
  }

  @Mutation(() => LocalAd, { name: 'toggleLocalAd' })
  @UseGuards(GqlAuthGuard)
  async toggleLocalAd(
    @Args('id') id: string,
    @Args('isActive') isActive: boolean,
  ): Promise<LocalAd> {
    return this.advertisersService.toggleLocalAd(id, isActive);
  }

  @Mutation(() => Boolean, { name: 'deleteLocalAd' })
  @UseGuards(GqlAuthGuard)
  async deleteLocalAd(
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.advertisersService.deleteLocalAd(id);
  }

  @Query(() => [LocalAd], { name: 'getMyAds' })
  @UseGuards(GqlAuthGuard)
  async getMyAds(@CurrentUser() user: User): Promise<LocalAd[]> {
    return this.advertisersService.getAdsByAdvertiser(user.id);
  }

  @Mutation(() => LocalAd, { name: 'createLocalAd' })
  @UseGuards(GqlAuthGuard)
  async createLocalAd(
    @Args('input') input: CreateLocalAdInput,
    @CurrentUser() user: User,
  ): Promise<LocalAd> {
    return this.advertisersService.createLocalAd(input, user.id);
  }

  @Mutation(() => LocalAd, { name: 'updateLocalAd' })
  @UseGuards(GqlAuthGuard)
  async updateLocalAd(
    @Args('input') input: UpdateLocalAdInput,
  ): Promise<LocalAd> {
    return this.advertisersService.updateLocalAd(input);
  }
}
