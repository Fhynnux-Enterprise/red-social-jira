import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
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
  ) {
    const userId = context.req.user.id;
    return this.storiesService.create(userId, mediaUrl, mediaType);
  }

  @Query(() => [Story], { name: 'getActiveStories' })
  @UseGuards(JwtGqlGuard)
  getActiveStories() {
    return this.storiesService.getActiveStories();
  }
}
