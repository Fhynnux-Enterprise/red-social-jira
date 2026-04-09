import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from './entities/job-offer.entity';
import { CreateJobOfferInput } from './dto/create-job-offer.input';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
  ) {}

  async createJobOffer(data: CreateJobOfferInput, userId: string): Promise<JobOffer> {
    const jobOffer = this.jobOfferRepository.create({
      ...data,
      id_user: userId,
    });
    const saved = await this.jobOfferRepository.save(jobOffer);
    return this.jobOfferRepository.findOne({
      where: { id_job_offer: saved.id_job_offer },
      relations: ['author'],
    }) as Promise<JobOffer>;
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
      where: { id_user: userId },
      order: { createdAt: 'DESC' },
      relations: ['author'],
    });
  }
}
