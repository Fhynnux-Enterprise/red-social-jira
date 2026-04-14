import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsResolver } from './reports.resolver';
import { Report } from './entities/report.entity';
import { Post } from '../posts/entities/post.entity';
import { PostMedia } from '../posts/entities/post-media.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { StoreProductMedia } from '../store/entities/store-product-media.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Report, Post, PostMedia, StoreProduct, StoreProductMedia])],
    providers: [ReportsService, ReportsResolver],
    exports: [ReportsService],
})
export class ReportsModule {}
