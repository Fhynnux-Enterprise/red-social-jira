import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageResolver } from './storage.resolver';

@Module({
  imports: [ConfigModule],
  providers: [StorageService, StorageResolver],
  exports: [StorageService],
})
export class StorageModule {}
