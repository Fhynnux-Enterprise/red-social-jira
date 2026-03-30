import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';
import { SupabaseService } from '../storage/supabase.service';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    @InjectRepository(Story)
    private readonly storiesRepository: Repository<Story>,
    @InjectRepository(StoryView)
    private readonly storyViewsRepository: Repository<StoryView>,
    private readonly supabaseService: SupabaseService,
  ) {}

  async create(userId: string, mediaUrl: string, mediaType: string, content?: string) {
    const story = this.storiesRepository.create({
      userId,
      mediaUrl,
      mediaType,
      content,
    });
    return this.storiesRepository.save(story);
  }

  // Obtiene historias activas agrupadas por usuario (paginado)
  async getActiveStories(skip: number = 0, take: number = 20) {
    return this.storiesRepository.createQueryBuilder('story')
      .leftJoinAndSelect('story.user', 'user')
      .where('story.expiresAt > CURRENT_TIMESTAMP')
      .orderBy('story.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getMany();
  }

  async markAsViewed(userId: string, storyId: string) {
    const existing = await this.storyViewsRepository.findOne({ where: { userId, storyId } });
    if (existing) return existing;

    const view = this.storyViewsRepository.create({ userId, storyId });
    return this.storyViewsRepository.save(view);
  }

  async getViewedStoryIds(userId: string): Promise<string[]> {
      const views = await this.storyViewsRepository.find({
          where: { userId },
          select: ['storyId']
      });
      return views.map(v => v.storyId);
  }

  async delete(userId: string, storyId: string): Promise<boolean> {
    const story = await this.storiesRepository.findOne({ where: { id: storyId, userId } });
    if (!story) throw new Error('Historia no encontrada o no autorizada');
    try {
      const urlParts = story.mediaUrl.split('/chunchi-media/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await this.supabaseService.deleteFile(filePath);
      }
      await this.storiesRepository.remove(story);
      return true;
    } catch (e: any) {
      this.logger.error(`Error al eliminar historia ${storyId}: ${e.message}`);
      return false;
    }
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
        const urlParts = story.mediaUrl.split('/chunchi-media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await this.supabaseService.deleteFile(filePath);
          this.logger.log(`Archivo eliminado de Storage: ${filePath}`);
        }
      } catch (error) {
        this.logger.error(`Error al limpiar archivo en storage para historia ${story.id}: ${error.message}`);
      } finally {
        // IMPORTANTE: Eliminamos el registro de la BD siempre, 
        // para evitar que la historia siga apareciendo si falla el storage.
        await this.storiesRepository.remove(story);
        this.logger.log(`Registro de historia ${story.id} eliminado de la base de datos.`);
      }
    }

    this.logger.log(`Limpieza terminada: ${expiredStories.length} historias procesadas.`);
  }
}
