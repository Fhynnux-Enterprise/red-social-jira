import { Module } from '@nestjs/common';
import { FeedResolver } from './feed.resolver';
import { FeedService } from './feed.service';
import { PostsModule } from '../posts/posts.module';
import { JobsModule } from '../jobs/jobs.module';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [
    PostsModule,   // exports PostsService
    JobsModule,    // exports JobsService, ProfessionalsService
    StoreModule,   // exports StoreService
  ],
  providers: [FeedResolver, FeedService],
})
export class FeedModule {}
