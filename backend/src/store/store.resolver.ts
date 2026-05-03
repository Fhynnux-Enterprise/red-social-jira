import { Resolver, Query, Mutation, Args, Int, ID, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreProduct } from './entities/store-product.entity';
import { CreateStoreProductInput } from './dto/create-store-product.input';
import { UpdateStoreProductInput } from './dto/update-store-product.input';
import { StoreProductComment } from './entities/store-product-comment.entity';
import { StoreProductLike } from './entities/store-product-like.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

import { PostsService } from '../posts/posts.service';

@Resolver(() => StoreProduct)
export class StoreResolver {
  constructor(
    private readonly storeService: StoreService,
    private readonly postsService: PostsService,
  ) {}

  @ResolveField(() => Boolean)
  async isSaved(
    @Parent() product: StoreProduct,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    if (!user) return false;
    return this.postsService.checkIfSaved(product.id, user.id, user.cityId);
  }

  @Query(() => [StoreProduct], { name: 'storeProducts' })
  @UseGuards(GqlAuthGuard)
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @CurrentUser() user: any,
  ) {
    return this.storeService.findAll(limit, offset, user.id, user.cityId);
  }

  @Query(() => [StoreProduct], { name: 'myStoreProducts' })
  @UseGuards(GqlAuthGuard)
  myProducts(@CurrentUser() user: User) {
    return this.storeService.findMine(user.id, user.cityId);
  }

  @Query(() => [StoreProduct], { name: 'storeProductsByUser' })
  @UseGuards(GqlAuthGuard)
  storeProductsByUser(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.storeService.findByUser(userId, currentUser.cityId, limit, offset);
  }

  @Query(() => StoreProduct, { name: 'getStoreProductById', nullable: true })
  @UseGuards(GqlAuthGuard)
  getStoreProductById(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.storeService.findById(id, currentUser.cityId);
  }

  @Mutation(() => StoreProduct)
  @UseGuards(GqlAuthGuard)
  createStoreProduct(
    @Args('input') input: CreateStoreProductInput,
    @CurrentUser() user: any,
  ) {
    return this.storeService.create(input, user.id, user.cityId);
  }

  @Mutation(() => StoreProduct)
  @UseGuards(GqlAuthGuard)
  updateStoreProduct(
    @Args('input') input: UpdateStoreProductInput,
    @CurrentUser() user: User,
  ) {
    return this.storeService.update(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  deleteStoreProduct(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.storeService.delete(id, user.id);
  }

  @ResolveField(() => Int)
  async commentsCount(@Parent() product: StoreProduct) {
    return this.storeService.countComments(product.id);
  }

  @Mutation(() => StoreProduct)
  @UseGuards(GqlAuthGuard)
  toggleStoreProductLike(
    @Args('productId', { type: () => ID }) productId: string,
    @CurrentUser() user: any,
  ) {
    return this.storeService.toggleLike(productId, user.id, user.cityId);
  }

  @Mutation(() => StoreProductComment)
  @UseGuards(GqlAuthGuard)
  createStoreProductComment(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('content') content: string,
    @Args('parentId', { type: () => ID, nullable: true }) parentId: string,
    @CurrentUser() user: any,
  ) {
    return this.storeService.createComment(productId, user.id, content, user.cityId, parentId);
  }

  @Query(() => [StoreProductComment], { name: 'getStoreProductComments' })
  @UseGuards(GqlAuthGuard)
  getStoreProductComments(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.storeService.getComments(productId, limit, offset);
  }

  @Query(() => StoreProductComment, { name: 'getStoreProductCommentById', nullable: true })
  @UseGuards(GqlAuthGuard)
  getStoreProductCommentById(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.storeService.getCommentById(id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  deleteStoreProductComment(
    @Args('commentId', { type: () => ID }) commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.storeService.deleteComment(commentId, user.id);
  }

  @Mutation(() => StoreProductComment)
  @UseGuards(GqlAuthGuard)
  toggleStoreProductCommentLike(
    @Args('commentId', { type: () => ID }) commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.storeService.toggleCommentLike(commentId, user.id, user.cityId);
  }
}

@Resolver(() => StoreProductComment)
export class StoreProductCommentResolver {
  constructor(private readonly storeService: StoreService) {}

  @ResolveField(() => Int)
  async likesCount(@Parent() comment: StoreProductComment) {
    // Si la entidad lo trae, úsalo, sino delega al servicio o asume 0.
    return comment.likes?.length ?? 0;
  }

  @ResolveField(() => Boolean)
  async isLikedByMe(@Parent() comment: StoreProductComment, @Context() ctx: any) {
    const userId = ctx.req.user?.id;
    if (!userId || !comment.likes) return false;
    return comment.likes.some((like) => like.userId === userId);
  }

  @ResolveField(() => [StoreProductComment])
  async replies(@Parent() comment: StoreProductComment) {
    return this.storeService.getCommentReplies(comment.id);
  }
}
