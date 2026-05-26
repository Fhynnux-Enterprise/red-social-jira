import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostMedia } from './entities/post-media.entity';
import { SavedItem } from './entities/saved-item.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { StoreProductLike } from '../store/entities/store-product-like.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';

import { StorageModule } from '../storage/storage.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsSubscriber } from './subscribers/posts.subscriber';

@Module({
    imports: [
        TypeOrmModule.forFeature([Post, PostLike, PostMedia, SavedItem, StoreProduct, StoreProductLike, JobOffer, ProfessionalProfile]),
        StorageModule,
        UserBlocksModule,
        NotificationsModule,
    ],
    providers: [PostsResolver, PostsService, PostsSubscriber],
    exports: [PostsService],
})
export class PostsModule { }
