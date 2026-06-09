import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { ProfessionalProfileMedia } from './entities/professional-profile-media.entity';
import { UpsertProfessionalProfileInput } from './dto/upsert-professional-profile.input';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { UserBlock } from '../user-blocks/entities/user-block.entity';
import { VisionService } from '../storage/vision.service';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(ProfessionalProfile)
    private readonly profileRepository: Repository<ProfessionalProfile>,
    @InjectRepository(ProfessionalProfileMedia)
    private readonly mediaRepository: Repository<ProfessionalProfileMedia>,
    private readonly userBlocksService: UserBlocksService,
    private readonly visionService: VisionService,
  ) {}

  async upsertProfessionalProfile(data: UpsertProfessionalProfileInput, userId: string): Promise<ProfessionalProfile> {
    const { media, ...profileData } = data;

    // Validar seguridad de imágenes antes de guardar el perfil
    if (media && media.length > 0) {
      for (const item of media) {
        if (item.type === 'IMAGE' || item.url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
          await this.visionService.validateImageSafety(item.url);
        }
      }
    }

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
    }

    // Siempre recargar el perfil con sus relaciones para devolver la entidad completa requerida por GraphQL
    return (await this.profileRepository.findOne({
      where: { id: savedProfile.id },
      relations: ['media', 'user'],
    })) ?? savedProfile;
  }

  async findAllProfessionals(limit: number = 20, offset: number = 0, viewerId?: string, cityId?: string): Promise<ProfessionalProfile[]> {
    const query = this.profileRepository.createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.media', 'media');

    // ── Multi-tenant filter ───────────────────────────────────────────────
    if (cityId) {
      query.andWhere('user.cityId = :cityId', { cityId });
    }

    if (viewerId) {
      query.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('1')
          .from(UserBlock, 'ub')
          .where('ub.blockerId = :viewerId AND ub.blockedId = profile.userId')
          .orWhere('ub.blockerId = profile.userId AND ub.blockedId = :viewerId')
          .getQuery();
        return 'NOT EXISTS ' + subQuery;
      });
      query.setParameter('viewerId', viewerId);
    }

    return query
      .take(limit)
      .skip(offset)
      .orderBy('profile.createdAt', 'DESC')
      .getMany();
  }
  
  async findOneByUserId(userId: string, cityId?: string): Promise<ProfessionalProfile | null> {
    const where: any = { userId };
    if (cityId) where.user = { cityId };
    return this.profileRepository.findOne({ where });
  }

  async findAllByUserId(userId: string, cityId?: string, limit = 20, offset = 0): Promise<ProfessionalProfile[]> {
    const where: any = { userId };
    // if (cityId) where.user = { cityId }; // Esto a veces falla si el join no está hecho, mejor usar query builder o simple find
    return this.profileRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['media', 'user'],
    });
  }

  async findOneById(id: string, cityId?: string): Promise<ProfessionalProfile | null> {
    const where: any = { id };
    if (cityId) where.user = { cityId };
    return this.profileRepository.findOne({ where, relations: ['media', 'user'] });
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

    // Validar seguridad de imágenes antes de editar el perfil
    if (media && media.length > 0) {
      for (const item of media) {
        if (item.type === 'IMAGE' || item.url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
          await this.visionService.validateImageSafety(item.url);
        }
      }
    }
    Object.keys(profileData).forEach(key => {
      if ((profileData as any)[key] !== undefined) {
        (profile as any)[key] = (profileData as any)[key];
      }
    });
    profile.editedAt = new Date(); // Marca de edición real del usuario
    const saved = await this.profileRepository.save(profile);

    return (await this.profileRepository.findOne({
      where: { id },
      relations: ['media', 'user'],
    })) ?? saved;
  }
}
