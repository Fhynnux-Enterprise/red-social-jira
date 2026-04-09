import { EventSubscriber, EntitySubscriberInterface, SoftRemoveEvent, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PostMedia } from '../entities/post-media.entity';
import { StorageService } from '../../storage/storage.service';

@Injectable()
@EventSubscriber()
export class PostsSubscriber implements EntitySubscriberInterface<PostMedia> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly storageService: StorageService,
    ) {
        // Registering mathematically to DataSource avoids manual array pushes in older TypeORM versions inside NestJS configs
        this.dataSource.subscribers.push(this);
    }

    listenTo() {
        return PostMedia;
    }

    async beforeSoftRemove(event: SoftRemoveEvent<PostMedia>) {
        if (!event.entity || !event.entity.url) {
            return;
        }

        try {
            // La URL pública de R2 se pasa directamente — StorageService.deleteFile
            // sabe cómo extraer el key relativo si recibe la URL completa.
            await this.storageService.deleteFile(event.entity.url);
        } catch (error) {
            console.error(`Failed to delete media file from R2 during soft remove: ${event.entity.url}`, error);
            // No tiramos el error para no bloquear la eliminación del registro en la BD,
            // pero lo logamos para monitoreo.
        }
    }
}
