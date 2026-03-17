import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { User } from '../auth/entities/user.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver()
export class FollowsResolver {
    constructor(private readonly followsService: FollowsService) { }

    @Mutation(() => Boolean, { name: 'toggleFollow' })
    @UseGuards(JwtGqlGuard)
    async toggleFollow(
        @Args('id_following') id_following: string,
        @CurrentUser() user: any,
    ): Promise<boolean> {
        return this.followsService.toggleFollow(user.id, id_following);
    }

    @Query(() => Boolean, { name: 'isFollowing' })
    @UseGuards(JwtGqlGuard)
    async isFollowing(
        @Args('id_following') id_following: string,
        @CurrentUser() user: any,
    ): Promise<boolean> {
        return this.followsService.isFollowing(user.id, id_following);
    }

    @Query(() => [User], { name: 'getFollowers' })
    @UseGuards(JwtGqlGuard)
    async getFollowers(
        @Args('id_user') id_user: string,
    ): Promise<User[]> {
        return this.followsService.getFollowers(id_user);
    }

    @Query(() => [User], { name: 'getFollowing' })
    @UseGuards(JwtGqlGuard)
    async getFollowing(
        @Args('id_user') id_user: string,
    ): Promise<User[]> {
        return this.followsService.getFollowing(id_user);
    }
}
