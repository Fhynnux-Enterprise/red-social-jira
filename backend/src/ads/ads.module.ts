import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { LocalAd } from '../advertisers/entities/local-ad.entity';
import { AdsService } from './ads.service';
import { AdsResolver } from './ads.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemConfig, LocalAd]),
  ],
  providers: [AdsService, AdsResolver],
  exports: [AdsService],
})
export class AdsModule {}
