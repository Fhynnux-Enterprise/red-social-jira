import { Module } from '@nestjs/common';
import { FeedResolver } from './feed.resolver';
import { FeedService } from './feed.service';
import { PostsModule } from '../posts/posts.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    PostsModule,   // exports PostsService
    JobsModule,    // exports JobsService, ProfessionalsService
  ],
  providers: [FeedResolver, FeedService],
})
export class FeedModule {}
