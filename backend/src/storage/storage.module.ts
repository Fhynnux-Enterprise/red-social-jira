import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { StorageResolver } from './storage.resolver';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseService, StorageResolver],
  exports: [SupabaseService],
})
export class StorageModule {}
