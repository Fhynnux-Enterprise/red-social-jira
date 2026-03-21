import { EventSubscriber, EntitySubscriberInterface, RemoveEvent, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PostMedia } from '../entities/post-media.entity';
import { SupabaseService } from '../../storage/supabase.service';

@Injectable()
@EventSubscriber()
export class PostsSubscriber implements EntitySubscriberInterface<PostMedia> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly supabaseService: SupabaseService,
    ) {
        // Registering mathematically to DataSource avoids manual array pushes in older TypeORM versions inside NestJS configs
        this.dataSource.subscribers.push(this);
    }

    listenTo() {
        return PostMedia;
    }

    async beforeRemove(event: RemoveEvent<PostMedia>) {
        if (!event.entity || !event.entity.url) {
            return;
        }

        try {
            // Ejemplo URL típica de Supabase Storage
            // https://[proyecto].supabase.co/storage/v1/object/public/chunchi-media/posts/cd1b22e1-abc-123.jpg
            const url = event.entity.url;
            const bucketName = 'chunchi-media';
            const marker = `/storage/v1/object/public/${bucketName}/`;
            
            if (url.includes(marker)) {
                const filePath = url.split(marker)[1]; // ej: "posts/cd1b22e1-abc-123.jpg"
                if (filePath) {
                    await this.supabaseService.deleteFile(filePath);
                }
            }
        } catch (error) {
            console.error(`Failed to delete media file from Supabase: ${event.entity.url}`, error);
            // No tiramos el error para no bloquear la eliminación del registro en la BD,
            // pero lo loegamos para monitoreo.
        }
    }
}
