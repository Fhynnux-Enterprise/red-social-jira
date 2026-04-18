import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appeal } from './entities/appeal.entity';
import { AppealsService } from './appeals.service';
import { AppealsResolver } from './appeals.resolver';
import { NotificationsModule } from '../notifications/notifications.module';
import { Post } from '../posts/entities/post.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';
import { User } from '../auth/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Appeal, Post, StoreProduct, JobOffer, ProfessionalProfile, User]),
        NotificationsModule
    ],
    providers: [AppealsService, AppealsResolver],
    exports: [AppealsService],
})
export class AppealsModule {}
