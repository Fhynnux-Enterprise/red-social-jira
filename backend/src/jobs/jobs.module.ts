import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobOffer } from './entities/job-offer.entity';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { JobOfferMedia } from './entities/job-offer-media.entity';
import { ProfessionalProfileMedia } from './entities/professional-profile-media.entity';
import { JobApplication } from './entities/job-application.entity';
// ...
import { JobsService } from './jobs.service';
import { ProfessionalsService } from './professionals.service';
import { ApplicationsService } from './applications.service';
import { JobsResolver } from './jobs.resolver';
import { ProfessionalsResolver } from './professionals.resolver';
import { ApplicationsResolver } from './applications.resolver';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobOffer, ProfessionalProfile, JobApplication, JobOfferMedia, ProfessionalProfileMedia]),
    AuthModule,
    StorageModule,
    UserBlocksModule,
  ],
  providers: [
    JobsService,
    ProfessionalsService,
    ApplicationsService,
    JobsResolver,
    ProfessionalsResolver,
    ApplicationsResolver,
  ],
  exports: [JobsService, ProfessionalsService, ApplicationsService],
})
export class JobsModule {}
