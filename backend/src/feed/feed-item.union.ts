import { createUnionType } from '@nestjs/graphql';
import { Post } from '../posts/entities/post.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';

/**
 * Union GraphQL que representa cualquier ítem del feed unificado.
 * resolveType usa instanceof sobre las clases TypeORM, que es
 * el método más fiable porque el servicio devuelve instancias reales.
 */
export const FeedItemUnion = createUnionType({
  name: 'FeedItem',
  types: () => [Post, JobOffer, ProfessionalProfile] as const,
  resolveType(value) {
    if (value instanceof Post) return Post;
    if (value instanceof JobOffer) return JobOffer;
    if (value instanceof ProfessionalProfile) return ProfessionalProfile;
    // Fallback por si TypeORM devuelve un plain object
    if ('content' in value) return Post;
    if ('location' in value) return JobOffer;
    if ('profession' in value) return ProfessionalProfile;
    return null;
  },
});
