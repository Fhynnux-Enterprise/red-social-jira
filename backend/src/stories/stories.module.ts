import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoriesService } from './stories.service';
import { StoriesResolver } from './stories.resolver';
import { Story } from './entities/story.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Story]),
    StorageModule, // Importamos para poder borrar archivos de Supabase
  ],
  providers: [StoriesService, StoriesResolver],
  exports: [StoriesService],
})
export class StoriesModule {}
