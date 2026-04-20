import { Injectable } from '@nestjs/common';
import { PostsService } from '../posts/posts.service';
import { JobsService } from '../jobs/jobs.service';
import { ProfessionalsService } from '../jobs/professionals.service';
import { StoreService } from '../store/store.service';
import { Post } from '../posts/entities/post.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';
import { StoreProduct } from '../store/entities/store-product.entity';

export type FeedItemType = Post | JobOffer | ProfessionalProfile | StoreProduct;

@Injectable()
export class FeedService {
  constructor(
    private readonly postsService: PostsService,
    private readonly jobsService: JobsService,
    private readonly professionalsService: ProfessionalsService,
    private readonly storeService: StoreService,
  ) {}

  /**
   * Obtiene un feed unificado con Posts, Ofertas de Empleo, Perfiles Profesionales y Productos
   * ordenados cronológicamente de más nuevo a más viejo, con paginación.
   */
  async getUnifiedFeed(limit: number, offset: number, userId?: string): Promise<FeedItemType[]> {
    const fetchLimit = limit + offset + 20;

    const [posts, jobOffers, professionals, products] = await Promise.all([
      this.postsService.findAll(fetchLimit, 0, userId),
      this.jobsService.findAllJobOffers(fetchLimit, 0, userId),
      this.professionalsService.findAllProfessionals(fetchLimit, 0, userId),
      this.storeService.findAll(fetchLimit, 0, userId),
    ]);

    const combined: FeedItemType[] = [
      ...posts,
      ...jobOffers,
      ...professionals,
      ...products,
    ];

    combined.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return combined.slice(offset, offset + limit);
  }
}
