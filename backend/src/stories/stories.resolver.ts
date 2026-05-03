import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { StoriesService } from './stories.service';
import { Story } from './entities/story.entity';
import { UseGuards } from '@nestjs/common';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';

@Resolver(() => Story)
export class StoriesResolver {
  constructor(private readonly storiesService: StoriesService) {}

  @Mutation(() => Story)
  @UseGuards(JwtGqlGuard)
  createStory(
    @Context() context: any,
    @Args('mediaUrl') mediaUrl: string,
    @Args('mediaType') mediaType: string,
    @Args('content', { nullable: true }) content?: string,
  ) {
    const user = context.req.user;
    return this.storiesService.create(user.id, mediaUrl, mediaType, user.cityId, content);
  }

  @Query(() => [Story], { name: 'getActiveStories' })
  @UseGuards(JwtGqlGuard)
  getActiveStories(
    @Context() context: any,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.storiesService.getActiveStories(offset, limit, context.req.user?.cityId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtGqlGuard)
  markStoryAsViewed(
    @Context() context: any,
    @Args('storyId') storyId: string,
  ) {
    const userId = context.req.user.id;
    return this.storiesService.markAsViewed(userId, storyId).then(() => true);
  }

  @Query(() => [String])
  @UseGuards(JwtGqlGuard)
  getViewedStoryIds(
    @Context() context: any,
  ) {
    const userId = context.req.user.id;
    return this.storiesService.getViewedStoryIds(userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtGqlGuard)
  deleteStory(
    @Context() context: any,
    @Args('id') id: string,
  ) {
    const userId = context.req.user.id;
    return this.storiesService.delete(userId, id);
  }
}
