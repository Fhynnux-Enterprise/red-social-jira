import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Story } from './entities/story.entity';
import { SupabaseService } from '../storage/supabase.service';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    @InjectRepository(Story)
    private readonly storiesRepository: Repository<Story>,
    private readonly supabaseService: SupabaseService,
  ) {}

  async create(userId: string, mediaUrl: string, mediaType: string) {
    const story = this.storiesRepository.create({
      userId,
      mediaUrl,
      mediaType,
    });
    return this.storiesRepository.save(story);
  }

  // Obtiene historias activas agrupadas por usuario
  async getActiveStories() {
    const now = new Date();
    // NOTA: Para agrupamiento real complejo se puede hacer en el resolver o con QueryBuilder
    // Aquí traemos todas las vigentes ordenadas por fecha
    return this.storiesRepository.find({
      where: { expiresAt: MoreThan(now) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // CRON JOB: Cada hora revisa y limpia lo que expiró
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredStories() {
    this.logger.log('Iniciando limpieza de historias expiradas...');
    const now = new Date();

    const expiredStories = await this.storiesRepository.find({
      where: { expiresAt: LessThan(now) },
    });

    if (expiredStories.length === 0) {
      this.logger.log('No se encontraron historias expiradas para limpiar.');
      return;
    }

    for (const story of expiredStories) {
      try {
        // Extraemos la ruta relativa al bucket 'chunchi-media'
        // La URL suele ser: .../chunchi-media/stories/usuario/archivo.ext
        const urlParts = story.mediaUrl.split('/chunchi-media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await this.supabaseService.deleteFile(filePath);
          this.logger.log(`Archivo eliminado de Storage: ${filePath}`);
        }

        await this.storiesRepository.remove(story);
        this.logger.log(`Registro de historia ${story.id} eliminado correctamente.`);
      } catch (error) {
        this.logger.error(`Error al limpiar historia ${story.id}: ${error.message}`);
      }
    }

    this.logger.log(`Limpieza terminada: ${expiredStories.length} historias procesadas.`);
  }
}
