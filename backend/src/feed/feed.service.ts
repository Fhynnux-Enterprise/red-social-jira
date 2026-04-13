import { Injectable } from '@nestjs/common';
import { PostsService } from '../posts/posts.service';
import { JobsService } from '../jobs/jobs.service';
import { ProfessionalsService } from '../jobs/professionals.service';
import { Post } from '../posts/entities/post.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';

export type FeedItemType = Post | JobOffer | ProfessionalProfile;

@Injectable()
export class FeedService {
  constructor(
    private readonly postsService: PostsService,
    private readonly jobsService: JobsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  /**
   * Obtiene un feed unificado con Posts, Ofertas de Empleo y Perfiles Profesionales
   * ordenados cronológicamente de más nuevo a más viejo, con paginación.
   *
   * Strategy: fetch un lote amplio de cada fuente, combina, ordena y
   * aplica limit+offset en memoria. Efectivo para volúmenes pequeños/medianos.
   */
  async getUnifiedFeed(limit: number, offset: number): Promise<FeedItemType[]> {
    // Fetching generoso para asegurar que tras mezclar tengamos suficientes items
    const fetchLimit = limit + offset + 20;

    const [posts, jobOffers, professionals] = await Promise.all([
      this.postsService.findAll(fetchLimit, 0),
      this.jobsService.findAllJobOffers(fetchLimit, 0),
      this.professionalsService.findAllProfessionals(fetchLimit, 0),
    ]);

    // Combinar todos los items
    const combined: FeedItemType[] = [
      ...posts,
      ...jobOffers,
      ...professionals,
    ];

    // Ordenar de más reciente a más antiguo
    combined.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Aplicar paginación
    return combined.slice(offset, offset + limit);
  }
}
