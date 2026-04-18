import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FeedService, FeedItemType } from './feed.service';
import { FeedItemUnion } from './feed-item.union';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver()
export class FeedResolver {
  constructor(private readonly feedService: FeedService) {}

  @Query(() => [FeedItemUnion], { name: 'getFeed' })
  @UseGuards(JwtGqlGuard)
  async getFeed(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @CurrentUser() user: any,
  ): Promise<FeedItemType[]> {
    return this.feedService.getUnifiedFeed(limit, offset, user.id);
  }
}
