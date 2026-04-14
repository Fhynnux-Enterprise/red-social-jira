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

        // Si el borrado viene de moderación, NO eliminar el archivo de R2.
        // El moderador solo quiere un soft-delete lógico, preservando el archivo
        // para evidencia futura en caso de apelación.
        if ((event.entity as any)._moderationDelete === true) {
            return;
        }

        try {
            await this.storageService.deleteFile(event.entity.url);
        } catch (error) {
            console.error(`Failed to delete media file from R2 during soft remove: ${event.entity.url}`, error);
        }
    }
}
