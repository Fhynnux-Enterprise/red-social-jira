import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserBlocksService } from './user-blocks.service';
import { UserBlock } from './entities/user-block.entity';
import { User } from '../auth/entities/user.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => UserBlock)
export class UserBlocksResolver {
  constructor(private readonly userBlocksService: UserBlocksService) {}

  @Mutation(() => UserBlock, { name: 'blockUser' })
  @UseGuards(JwtGqlGuard)
  async blockUser(
    @Args('userId') blockedId: string,
    @CurrentUser() user: any,
  ): Promise<UserBlock> {
    return this.userBlocksService.blockUser(user.id, blockedId);
  }

  @Mutation(() => Boolean, { name: 'unblockUser' })
  @UseGuards(JwtGqlGuard)
  async unblockUser(
    @Args('userId') blockedId: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.userBlocksService.unblockUser(user.id, blockedId);
  }

  @Query(() => [User], { name: 'getMyBlockedUsers' })
  @UseGuards(JwtGqlGuard)
  async getMyBlockedUsers(
    @CurrentUser() user: any,
    @Args('limit', { nullable: true }) limit?: number,
    @Args('offset', { nullable: true }) offset?: number,
  ): Promise<User[]> {
    return this.userBlocksService.getBlockedUsers(user.id, limit, offset);
  }
}
