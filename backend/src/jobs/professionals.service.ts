import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { ProfessionalProfileMedia } from './entities/professional-profile-media.entity';
import { UpsertProfessionalProfileInput } from './dto/upsert-professional-profile.input';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(ProfessionalProfile)
    private readonly profileRepository: Repository<ProfessionalProfile>,
    @InjectRepository(ProfessionalProfileMedia)
    private readonly mediaRepository: Repository<ProfessionalProfileMedia>,
  ) {}

  async upsertProfessionalProfile(data: UpsertProfessionalProfileInput, userId: string): Promise<ProfessionalProfile> {
    const { media, ...profileData } = data;

    // Siempre crear un nuevo perfil (es una publicación, no un upsert por usuario)
    const profile = this.profileRepository.create({
      ...profileData,
      userId,
    });

    // Guardar perfil primero para obtener su ID
    const savedProfile = await this.profileRepository.save(profile);

    // Si hay media, crearla explícitamente con el FK asignado
    if (media && media.length > 0) {
      const mediaEntities = media.map((m) =>
        this.mediaRepository.create({
          ...m,
          professionalProfileId: savedProfile.id,
        }),
      );
      await this.mediaRepository.save(mediaEntities);
      // Recargar el perfil con su media para devolver la entidad completa
      return (await this.profileRepository.findOne({
        where: { id: savedProfile.id },
        relations: ['media', 'user'],
      })) ?? savedProfile;
    }

    return savedProfile;
  }

  async findAllProfessionals(limit: number = 20, offset: number = 0): Promise<ProfessionalProfile[]> {
    return this.profileRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }
  
  async findOneByUserId(userId: string): Promise<ProfessionalProfile | null> {
    return this.profileRepository.findOne({ where: { userId } });
  }

  async deleteProfessionalProfile(id: string, userId: string): Promise<boolean> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Perfil profesional no encontrado.');
    if (profile.userId !== userId) throw new ForbiddenException('No puedes eliminar este perfil.');
    await this.profileRepository.remove(profile);
    return true;
  }

  async updateProfessionalProfile(
    id: string,
    data: UpsertProfessionalProfileInput,
    userId: string,
  ): Promise<ProfessionalProfile> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Perfil profesional no encontrado.');
    if (profile.userId !== userId) throw new ForbiddenException('No puedes editar este perfil.');

    const { media, ...profileData } = data;
    Object.assign(profile, profileData);
    const saved = await this.profileRepository.save(profile);

    if (media !== undefined) {
      // Eliminar media antigua y reemplazar
      await this.mediaRepository.delete({ professionalProfileId: id });
      if (media.length > 0) {
        const mediaEntities = media.map((m) =>
          this.mediaRepository.create({ ...m, professionalProfileId: id }),
        );
        await this.mediaRepository.save(mediaEntities);
      }
    }

    return (await this.profileRepository.findOne({
      where: { id },
      relations: ['media', 'user'],
    })) ?? saved;
  }
}
