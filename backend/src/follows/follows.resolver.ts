import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
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
        @Args('followingId') followingId: string,
        @CurrentUser() user: any,
    ): Promise<boolean> {
        return this.followsService.toggleFollow(user.id, followingId);
    }

    @Query(() => Boolean, { name: 'isFollowing' })
    @UseGuards(JwtGqlGuard)
    async isFollowing(
        @Args('followingId') followingId: string,
        @CurrentUser() user: any,
    ): Promise<boolean> {
        return this.followsService.isFollowing(user.id, followingId);
    }

    @Query(() => [User], { name: 'getFollowers' })
    @UseGuards(JwtGqlGuard)
    async getFollowers(
        @Args('userId') userId: string,
    ): Promise<User[]> {
        return this.followsService.getFollowers(userId);
    }

    @Query(() => [User], { name: 'getFollowing' })
    @UseGuards(JwtGqlGuard)
    async getFollowing(
        @Args('userId') userId: string,
    ): Promise<User[]> {
        return this.followsService.getFollowing(userId);
    }

    @Query(() => [User], { name: 'getOnlineFollowing' })
    @UseGuards(JwtGqlGuard)
    async getOnlineFollowing(
        @CurrentUser() user: any,
    ): Promise<User[]> {
        return this.followsService.getOnlineFollowing(user.id);
    }

    @Query(() => Int, { name: 'getOnlineFollowingCount' })
    @UseGuards(JwtGqlGuard)
    async getOnlineFollowingCount(
        @CurrentUser() user: any,
    ): Promise<number> {
        return this.followsService.getOnlineFollowingCount(user.id);
    }
}
