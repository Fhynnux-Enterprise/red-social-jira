import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageResolver } from './storage.resolver';
import { VisionService } from './vision.service';

@Module({
  imports: [ConfigModule],
  providers: [StorageService, StorageResolver, VisionService],
  exports: [StorageService, VisionService],
})
export class StorageModule {}
