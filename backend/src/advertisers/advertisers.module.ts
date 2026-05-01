import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertiserPermission } from './entities/advertiser-permission.entity';
import { LocalAd } from './entities/local-ad.entity';
import { LocalAdMedia } from './entities/local-ad-media.entity';
import { AdvertisersService } from './advertisers.service';
import { AdvertisersResolver } from './advertisers.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdvertiserPermission, LocalAd, LocalAdMedia]),
  ],
  providers: [AdvertisersService, AdvertisersResolver],
  exports: [AdvertisersService],
})
export class AdvertisersModule {}
