import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { AdsService } from './ads.service';
import { AdDecision } from './dto/ad-decision.type';

@Resolver()
export class AdsResolver {
  constructor(private readonly adsService: AdsService) {}

  @Query(() => AdDecision, { name: 'getNextAd' })
  async getNextAd(): Promise<AdDecision> {
    return this.adsService.getNextAdDecision();
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
