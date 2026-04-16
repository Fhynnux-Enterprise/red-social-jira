import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from './entities/job-offer.entity';
import { CreateJobOfferInput } from './dto/create-job-offer.input';
import { UpdateJobOfferInput } from './dto/update-job-offer.input';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
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
    Object.assign(offer, updates);
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

  async findAllJobOffers(limit: number = 20, offset: number = 0): Promise<JobOffer[]> {
    return this.jobOfferRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
      relations: ['author'],
    });
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
