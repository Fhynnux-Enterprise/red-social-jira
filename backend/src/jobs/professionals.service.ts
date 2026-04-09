import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { UpsertProfessionalProfileInput } from './dto/upsert-professional-profile.input';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(ProfessionalProfile)
    private readonly profileRepository: Repository<ProfessionalProfile>,
  ) {}

  async upsertProfessionalProfile(data: UpsertProfessionalProfileInput, userId: string): Promise<ProfessionalProfile> {
    let profile = await this.profileRepository.findOne({ where: { id_user: userId } });

    if (profile) {
      Object.assign(profile, data);
    } else {
      profile = this.profileRepository.create({
        ...data,
        id_user: userId,
      });
    }

    return this.profileRepository.save(profile);
  }

  async findAllProfessionals(limit: number = 20, offset: number = 0): Promise<ProfessionalProfile[]> {
    return this.profileRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }
  
  async findOneByUserId(userId: string): Promise<ProfessionalProfile | null> {
    return this.profileRepository.findOne({ where: { id_user: userId } });
  }
}
