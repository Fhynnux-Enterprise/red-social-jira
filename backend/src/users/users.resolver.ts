import { Resolver, Mutation, Query, Args, ResolveField, Parent, Int } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserCustomField } from './entities/user-custom-field.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../auth/entities/user.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { FollowsService } from '../follows/follows.service';
import { PostsService } from '../posts/posts.service';
import { Post } from '../posts/entities/post.entity';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly followsService: FollowsService,
    private readonly postsService: PostsService,
  ) { }

  @ResolveField(() => Int)
  async followersCount(@Parent() user: User): Promise<number> {
    return this.followsService.getFollowersCount(user.id);
  }

  @ResolveField(() => Int)
  async followingCount(@Parent() user: User): Promise<number> {
    return this.followsService.getFollowingCount(user.id);
  }

  @ResolveField(() => [Post])
  async posts(
    @Parent() user: User,
    @Args('limit', { type: () => Int, defaultValue: 5, nullable: true }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0, nullable: true }) offset: number,
  ): Promise<Post[]> {
    return this.postsService.findByUser(user.id, limit ?? 5, offset ?? 0);
  }

  @Mutation(() => UserCustomField)
  @UseGuards(JwtGqlGuard)
  async addCustomField(
    @Args('title') title: string,
    @Args('value') value: string,
    @CurrentUser() user: any,
  ): Promise<UserCustomField> {
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

  @Query(() => User)
  @UseGuards(JwtGqlGuard)
  async getUserProfile(
    @Args('id') id: string,
    @CurrentUser() currentUser: any,
  ): Promise<User> {
    const user = await this.usersService.findById(id);
    
    // Si el usuario está baneado, ocultarlo (simular que no existe)
    // a menos que sea un ADMIN o MODERATOR quien lo consulta.
    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MODERATOR) {
        throw new BadRequestException('Usuario no encontrado');
      }
    }
    
    return user;
  }

  @Query(() => User, { name: 'me' })
  @UseGuards(JwtGqlGuard)
  async getMe(@CurrentUser() user: any): Promise<User> {
    return this.usersService.findById(user.id);
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

  @Mutation(() => User)
  @UseGuards(JwtGqlGuard)
  async updateProfileMedia(
    @Args('photoUrl', { nullable: true }) photoUrl: string,
    @Args('coverUrl', { nullable: true }) coverUrl: string,
    @CurrentUser() user: any,
  ): Promise<User> {
    return this.usersService.updateProfileMedia(user.id, photoUrl, coverUrl);
  }

  @Query(() => [User], { name: 'searchUsers' })
  @UseGuards(JwtGqlGuard)
  async searchUsers(
    @Args('searchTerm') searchTerm: string,
    @Args('limit', { type: () => Int, defaultValue: 5, nullable: true }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0, nullable: true }) offset: number,
    @CurrentUser() user: any,
  ): Promise<User[]> {
    return this.usersService.searchUsers(searchTerm, user.id, limit ?? 5, offset ?? 0);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtGqlGuard)
  async pingPresence(@CurrentUser() user: any): Promise<boolean> {
    return this.usersService.pingPresence(user.id);
  }

  // ─── Moderación: suspensión / baneo ────────────────────────────────────────

  @Mutation(() => User, { description: 'Suspende o banea a un usuario por X días. Si durationInDays=999 se considera permanente. wipeContent permite borrar todo su contenido.' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async banUser(
    @Args('userId') userId: string,
    @Args('durationInDays', { type: () => Int }) durationInDays: number,
    @Args('reason') reason: string,
    @Args('wipeContent', { type: () => Boolean, nullable: true, defaultValue: false }) wipeContent: boolean,
  ): Promise<User> {
    return this.usersService.banUser(userId, durationInDays, reason, wipeContent);
  }

  @Mutation(() => User, { description: 'Levanta la suspensión de un usuario.' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async unbanUser(
    @Args('userId') userId: string,
  ): Promise<User> {
    return this.usersService.unbanUser(userId);
  }

  @Query(() => [User], { name: 'getBannedUsers', description: 'Lista todos los usuarios actualmente baneados.' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getBannedUsers(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 15 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
    @Args('searchTerm', { type: () => String, nullable: true }) searchTerm?: string,
  ): Promise<User[]> {
    return this.usersService.getBannedUsers(limit, offset, searchTerm);
  }
}
