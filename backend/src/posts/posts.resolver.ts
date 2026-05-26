import { Resolver, Query, Mutation, Args, Context, ResolveField, Parent, Int, createUnionType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { SavedItemType } from './entities/saved-item.entity';
import { JwtGqlGuard } from '../auth/guards/jwt-gql.guard';
import { PostMediaInput } from './dto/post-media.input';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StoreProduct } from '../store/entities/store-product.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';

export const SavedContentUnion = createUnionType({
    name: 'SavedContent',
    types: () => [Post, StoreProduct, JobOffer, ProfessionalProfile] as const,
    resolveType(value) {
        if (value.__typename === 'Post') return Post;
        if (value.__typename === 'StoreProduct') return StoreProduct;
        if (value.__typename === 'JobOffer') return JobOffer;
        if (value.__typename === 'ProfessionalProfile') return ProfessionalProfile;
        
        if (value.content) return Post;
        if (value.price !== undefined) return StoreProduct;
        if (value.jobTitle !== undefined) return JobOffer;
        if (value.profession !== undefined) return ProfessionalProfile;
        return Post;
    },
});

export const LikedContentUnion = createUnionType({
    name: 'LikedContent',
    types: () => [Post, StoreProduct] as const,
    resolveType(value) {
        if (value.__typename === 'Post') return Post;
        if (value.__typename === 'StoreProduct') return StoreProduct;
        
        if (value.content) return Post;
        if (value.price !== undefined) return StoreProduct;
        return Post;
    },
});

@Resolver(() => Post)
export class PostsResolver {
    constructor(private readonly postsService: PostsService) { }

    @ResolveField(() => Int)
    async commentsCount(@Parent() post: Post): Promise<number> {
        // If loaded via loadRelationCountAndMap
        if (post.commentsCount !== undefined) {
            return post.commentsCount;
        }
        if (post.comments !== undefined) {
            return post.comments.length;
        }
        return this.postsService.countComments(post.id);
    }

    @ResolveField(() => Boolean)
    async isSaved(
        @Parent() post: Post,
        @CurrentUser() user: any,
    ): Promise<boolean> {
        if (!user) return false;
        return this.postsService.checkIfSaved(post.id, user.id, user.cityId);
    }

    @Query(() => Post, { name: 'getPostById', nullable: true })
    @UseGuards(JwtGqlGuard)
    async getPostById(
        @Args('id') id: string,
        @CurrentUser() user: any,
    ): Promise<Post | null> {
        return this.postsService.findById(id, user.cityId);
    }

    @Query(() => [Post], { name: 'getPosts' })
    @UseGuards(JwtGqlGuard)
    async getPosts(
        @Args('limit', { type: () => Int, defaultValue: 5 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
        @CurrentUser() user: any,
    ): Promise<Post[]> {
        return this.postsService.findAll(limit, offset, user.id, user.cityId);
    }

    @Mutation(() => Post, { name: 'createPost' })
    @UseGuards(JwtGqlGuard)
    async createPost(
        @Args('content') content: string,
        @Args('title', { nullable: true }) title: string,
        @Args('media', { type: () => [PostMediaInput], nullable: true }) media: PostMediaInput[],
        @CurrentUser() user: any,
    ): Promise<Post> {
        return this.postsService.createPost(content, user.id, user.cityId, media, title);
    }

    @Mutation(() => Post, { name: 'updatePost' })
    @UseGuards(JwtGqlGuard)
    async updatePost(
        @Args('id') id: string,
        @Args('content') content: string,
        @Args('title', { nullable: true }) title: string,
        @Context() context: any,
    ): Promise<Post> {
        const userId = context.req.user.id;
        return this.postsService.updatePost(id, content, userId, title);
    }

    @Mutation(() => Boolean, { name: 'deletePost' })
    @UseGuards(JwtGqlGuard)
    async deletePost(
        @Args('id') id: string,
        @Context() context: any,
    ): Promise<boolean> {
        const userId = context.req.user.id;
        return this.postsService.deletePost(id, userId);
    }

    @Mutation(() => Post, { name: 'toggleLike' })
    @UseGuards(JwtGqlGuard)
    async toggleLike(
        @Args('postId') postId: string,
        @CurrentUser() user: any,
    ): Promise<Post> {
        return this.postsService.toggleLike(postId, user.id, user.cityId);
    }

    @Query(() => [Post], { name: 'searchPosts' })
    @UseGuards(JwtGqlGuard)
    async searchPosts(
        @Args('query') query: string,
        @Args('limit', { type: () => Int, defaultValue: 5 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
        @CurrentUser() user: any,
    ): Promise<Post[]> {
        return this.postsService.searchPosts(query, limit, offset, user.cityId);
    }

    @Mutation(() => Boolean, { name: 'toggleSavePost' })
    @UseGuards(JwtGqlGuard)
    async toggleSavePost(
        @Args('postId') postId: string,
        @Args('itemType', { type: () => SavedItemType, defaultValue: SavedItemType.POST }) itemType: SavedItemType,
        @CurrentUser() user: any,
    ): Promise<boolean> {
        return this.postsService.toggleSaveItem(postId, itemType, user.id, user.cityId);
    }

    @Query(() => [SavedContentUnion], { name: 'getSavedPosts' })
    @UseGuards(JwtGqlGuard)
    async getSavedPosts(
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
        @CurrentUser() user: any,
    ): Promise<Array<typeof SavedContentUnion>> {
        return this.postsService.getSavedItems(user.id, user.cityId, limit, offset) as any;
    }
    @Query(() => [LikedContentUnion], { name: 'getLikedItems' })
    @UseGuards(JwtGqlGuard)
    async getLikedItems(
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
        @CurrentUser() user: any,
    ): Promise<Array<typeof LikedContentUnion>> {
        return this.postsService.getLikedItems(user.id, user.cityId, limit, offset) as any;
    }
}
