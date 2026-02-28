import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserCustomField } from './entities/user-custom-field.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../auth/entities/user.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => UserCustomField)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) { }

  @Mutation(() => UserCustomField)
  @UseGuards(JwtGqlGuard)
  async addCustomField(
    @Args('title') title: string,
    @Args('value') value: string,
    @CurrentUser() user: any,
  ): Promise<UserCustomField> {
    // En nuestro JwtStrategy devolvemos el sub como req.user.id
    return this.usersService.addCustomField(user.id, title, value);
  }

  @Mutation(() => UserCustomField)
  @UseGuards(JwtGqlGuard)
  async updateCustomField(
    @Args('id') id: string,
    @Args('title') title: string,
    @Args('value') value: string,
    @CurrentUser() user: any,
  ): Promise<UserCustomField> {
    return this.usersService.updateCustomField(user.id, id, title, value);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtGqlGuard)
  async deleteCustomField(
    @Args('id') id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.usersService.deleteCustomField(user.id, id);
  }

  @Mutation(() => UserBadge)
  @UseGuards(JwtGqlGuard)
  async updateBadge(
    @Args('title') title: string,
    @Args('theme', { defaultValue: 'default', nullable: true }) theme: string,
    @CurrentUser() user: any,
  ): Promise<UserBadge> {
    return this.usersService.upsertBadge(user.id, title, theme);
  }

  @Mutation(() => User)
  @UseGuards(JwtGqlGuard)
  async updateProfile(
    @Args('firstName', { nullable: true }) firstName: string,
    @Args('lastName', { nullable: true }) lastName: string,
    @Args('bio', { nullable: true }) bio: string,
    @Args('username', { nullable: true }) username: string,
    @Args('phone', { nullable: true }) phone: string,
    @CurrentUser() user: any,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, firstName, lastName, bio, username, phone);
  }
}
