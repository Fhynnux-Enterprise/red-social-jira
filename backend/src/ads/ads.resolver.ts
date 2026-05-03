import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdDecision } from './dto/ad-decision.type';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver()
export class AdsResolver {
  constructor(private readonly adsService: AdsService) {}

  @Query(() => AdDecision, { name: 'getNextAd' })
  @UseGuards(JwtGqlGuard)
  async getNextAd(@CurrentUser() user: any): Promise<AdDecision> {
    return this.adsService.getNextAdDecision(user?.cityId);
  }

  @Mutation(() => Boolean, { name: 'registerAdClick' })
  async registerAdClick(@Args('adId') adId: string): Promise<boolean> {
    return this.adsService.registerAdClick(adId);
  }

  @Query(() => Int, { name: 'getAdFrequency' })
  async getAdFrequency(): Promise<number> {
    return this.adsService.getAdFrequency();
  }

  @Mutation(() => Boolean, { name: 'updateAdFrequency' })
  async updateAdFrequency(@Args('frequency', { type: () => Int }) frequency: number): Promise<boolean> {
    return this.adsService.updateAdFrequency(frequency);
  }

  @Query(() => Int, { name: 'getAdProbability' })
  async getAdProbability(): Promise<number> {
    return this.adsService.getAdProbability();
  }

  @Mutation(() => Boolean, { name: 'updateAdProbability' })
  async updateAdProbability(@Args('probability', { type: () => Int }) probability: number): Promise<boolean> {
    return this.adsService.updateAdProbability(probability);
  }
}
