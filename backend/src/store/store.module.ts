import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreProduct } from './entities/store-product.entity';
import { StoreProductMedia } from './entities/store-product-media.entity';
import { StoreProductLike } from './entities/store-product-like.entity';
import { StoreProductComment } from './entities/store-product-comment.entity';
import { StoreProductCommentLike } from './entities/store-product-comment-like.entity';
import { StoreService } from './store.service';
import { StoreResolver, StoreProductCommentResolver } from './store.resolver';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreProduct, StoreProductMedia, StoreProductLike, StoreProductComment, StoreProductCommentLike]),
    UserBlocksModule,
  ],
  providers: [StoreService, StoreResolver, StoreProductCommentResolver],
  exports: [StoreService],
})
export class StoreModule {}
