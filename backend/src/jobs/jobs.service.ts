import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from './entities/job-offer.entity';
import { CreateJobOfferInput } from './dto/create-job-offer.input';
import { UpdateJobOfferInput } from './dto/update-job-offer.input';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { UserBlock } from '../user-blocks/entities/user-block.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    private readonly userBlocksService: UserBlocksService,
  ) {}

  async createJobOffer(data: CreateJobOfferInput, userId: string): Promise<JobOffer> {
    const jobOffer = this.jobOfferRepository.create({
      ...data,
      authorId: userId,
    });
    const saved = await this.jobOfferRepository.save(jobOffer);
    return this.jobOfferRepository.findOne({
      where: { id: saved.id },
      relations: ['author'],
    }) as Promise<JobOffer>;
  }

  async updateJobOffer(data: UpdateJobOfferInput, userId: string): Promise<JobOffer> {
    const offer = await this.jobOfferRepository.findOne({ where: { id: data.id } });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.authorId !== userId) throw new ForbiddenException('No tienes permiso para editar esta oferta');

    const { id, ...updates } = data;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        (offer as any)[key] = (updates as any)[key];
      }
    });
    offer.editedAt = new Date(); // Marca de edición real del usuario
    await this.jobOfferRepository.save(offer);

    return this.jobOfferRepository.findOne({
      where: { id },
      relations: ['author'],
    }) as Promise<JobOffer>;
  }

  async deleteJobOffer(id: string, userId: string): Promise<boolean> {
    const offer = await this.jobOfferRepository.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.authorId !== userId) throw new ForbiddenException('No tienes permiso para eliminar esta oferta');

    await this.jobOfferRepository.remove(offer);
    return true;
  }

  async findAllJobOffers(limit: number = 20, offset: number = 0, viewerId?: string): Promise<JobOffer[]> {
    const query = this.jobOfferRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.author', 'author');

    if (viewerId) {
      query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('1')
          .from(UserBlock, 'ub')
          .where('ub.blockerId = :viewerId AND ub.blockedId = job.authorId')
          .orWhere('ub.blockerId = job.authorId AND ub.blockedId = :viewerId')
          .getQuery();
        return 'NOT EXISTS ' + subQuery;
      });
      query.setParameter('viewerId', viewerId);
    }

    return query
      .take(limit)
      .skip(offset)
      .orderBy('job.createdAt', 'DESC')
      .getMany();
  }

  async findMyJobOffers(userId: string): Promise<JobOffer[]> {
    return this.jobOfferRepository.find({
      where: { authorId: userId },
      order: { createdAt: 'DESC' },
      relations: ['author'],
    });
  }

  async findJobOffersByUser(userId: string): Promise<JobOffer[]> {
    return this.jobOfferRepository.find({
      where: { authorId: userId },
      order: { createdAt: 'DESC' },
      relations: ['author', 'media'],
    });
  }

  async getJobOfferById(id: string): Promise<JobOffer> {
    const offer = await this.jobOfferRepository.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    return offer;
  }
}
