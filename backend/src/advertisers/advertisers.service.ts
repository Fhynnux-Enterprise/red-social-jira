import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvertiserPermission } from './entities/advertiser-permission.entity';
import { LocalAd } from './entities/local-ad.entity';
import { LocalAdMedia } from './entities/local-ad-media.entity';
import { GrantAdvertiserInput, UpdateAdvertiserPermissionInput, CreateLocalAdInput, UpdateLocalAdInput } from './dto/advertiser.input';

@Injectable()
export class AdvertisersService {
  constructor(
    @InjectRepository(AdvertiserPermission)
    private readonly permissionRepo: Repository<AdvertiserPermission>,
    @InjectRepository(LocalAd)
    private readonly localAdRepo: Repository<LocalAd>,
    @InjectRepository(LocalAdMedia)
    private readonly mediaRepo: Repository<LocalAdMedia>,
  ) {}

  // ─── Helper: reload with relations ──────────────────────────────────────────

  private async reloadPermission(id: string): Promise<AdvertiserPermission> {
    const result = await this.permissionRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!result) throw new NotFoundException(`Permiso ${id} no encontrado`);
    return result;
  }

  async reloadLocalAd(id: string): Promise<LocalAd> {
    const result = await this.localAdRepo.findOne({
      where: { id },
      relations: ['advertiser', 'media'],
    });
    if (!result) throw new NotFoundException(`Anuncio ${id} no encontrado`);
    return result;
  }

  // ─── Permissions ─────────────────────────────────────────────────────────────

  /** Obtiene permisos de anunciantes con soporte para búsqueda y paginación. */
  async getAllPermissions(search?: string, limit: number = 20, offset: number = 0): Promise<AdvertiserPermission[]> {
    const query = this.permissionRepo.createQueryBuilder('permission')
      .leftJoinAndSelect('permission.user', 'user')
      .orderBy('permission.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (search) {
      const s = `%${search}%`;
      query.andWhere(
        '(user.username ILIKE :s OR user.firstName ILIKE :s OR user.lastName ILIKE :s)',
        { s },
      );
    }

    return query.getMany();
  }

  /**
   * Otorga permiso de anunciante a un usuario.
   * Si ya existe un permiso para ese usuario, lo reactiva y actualiza.
   */
  async grantPermission(
    input: GrantAdvertiserInput,
    adminId: string,
  ): Promise<AdvertiserPermission> {
    const existing = await this.permissionRepo.findOne({
      where: { userId: input.userId },
    });

    if (existing) {
      existing.isActive = true;
      existing.expiresAt = input.expiresAt;
      existing.maxAds = input.maxAds ?? existing.maxAds;
      existing.grantedBy = adminId;
      await this.permissionRepo.save(existing);
      return this.reloadPermission(existing.id);
    }

    const defaultExpiresAt = new Date();
    defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 31);

    const permission = this.permissionRepo.create({
      userId: input.userId,
      expiresAt: input.expiresAt || defaultExpiresAt,
      maxAds: input.maxAds ?? 5,
      isActive: true,
      grantedBy: adminId,
    });

    await this.permissionRepo.save(permission);
    return this.reloadPermission(permission.id);
  }

  /** Actualiza un permiso de anunciante. */
  async updatePermission(
    input: UpdateAdvertiserPermissionInput,
  ): Promise<AdvertiserPermission> {
    const permission = await this.reloadPermission(input.id);

    if (input.isActive !== undefined) permission.isActive = input.isActive;
    if (input.expiresAt) permission.expiresAt = input.expiresAt;
    if (input.maxAds !== undefined) permission.maxAds = input.maxAds;

    await this.permissionRepo.save(permission);
    return this.reloadPermission(permission.id);
  }

  /** Revoca (elimina) un permiso de anunciante. */
  async revokePermission(id: string): Promise<boolean> {
    const result = await this.permissionRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /** Verifica si un usuario tiene permiso de anunciante activo y vigente. */
  async hasActivePermission(userId: string): Promise<boolean> {
    const permission = await this.permissionRepo.findOne({
      where: { userId, isActive: true },
    });
    if (!permission) return false;
    return new Date() < new Date(permission.expiresAt);
  }

  /** Obtiene el permiso de anunciante del usuario actual. */
  async getMyPermission(userId: string): Promise<AdvertiserPermission | null> {
    return this.permissionRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  // ─── Local Ads ───────────────────────────────────────────────────────────────

  /** Obtiene todos los anuncios locales creados por anunciantes. */
  async getAllLocalAds(): Promise<LocalAd[]> {
    return this.localAdRepo.find({
      relations: ['advertiser', 'media'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Obtiene los anuncios de un anunciante específico. */
  async getAdsByAdvertiser(advertiserId: string): Promise<LocalAd[]> {
    return this.localAdRepo.find({
      where: { advertiserId },
      relations: ['media'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Crea un nuevo anuncio local para el anunciante autenticado. */
  async createLocalAd(input: CreateLocalAdInput, advertiserId: string): Promise<LocalAd> {
    const permission = await this.permissionRepo.findOne({ where: { userId: advertiserId } });
    if (!permission) throw new NotFoundException('No tienes permiso de anunciante');

    const currentAdsCount = await this.localAdRepo.count({ where: { advertiserId } });
    if (currentAdsCount >= permission.maxAds) {
      throw new BadRequestException(`Has alcanzado tu límite máximo de ${permission.maxAds} anuncios. Elimina uno para publicar otro.`);
    }

    const ad = this.localAdRepo.create({
      advertiserId,
      title: input.title,
      description: input.description,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel ?? 'Ver más',
      whatsappPhone: input.whatsappPhone,
      isActive: true,
    });

    // Guardamos primero el anuncio para obtener el ID
    await this.localAdRepo.save(ad);

    // Guardamos los archivos multimedia si los hay
    if (input.media && input.media.length > 0) {
      const mediaEntities = input.media.map((m) =>
        this.mediaRepo.create({ adId: ad.id, url: m.url, type: m.type, thumbnailUrl: m.thumbnailUrl }),
      );
      await this.mediaRepo.save(mediaEntities);
    }

    return this.reloadLocalAd(ad.id);
  }

  /** Activa o desactiva un anuncio local. */
  async toggleLocalAd(id: string, isActive: boolean): Promise<LocalAd> {
    const ad = await this.reloadLocalAd(id);
    ad.isActive = isActive;
    await this.localAdRepo.save(ad);
    return this.reloadLocalAd(id);
  }

  /** Elimina un anuncio local y su media asociada (cascade). */
  async deleteLocalAd(id: string): Promise<boolean> {
    const result = await this.localAdRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /** Actualiza un anuncio local. */
  async updateLocalAd(input: UpdateLocalAdInput): Promise<LocalAd> {
    const ad = await this.reloadLocalAd(input.id);

    if (input.title !== undefined) ad.title = input.title;
    if (input.description !== undefined) ad.description = input.description;
    if (input.actionUrl !== undefined) ad.actionUrl = input.actionUrl;
    if (input.actionLabel !== undefined) ad.actionLabel = input.actionLabel;
    if (input.whatsappPhone !== undefined) ad.whatsappPhone = input.whatsappPhone;

    await this.localAdRepo.save(ad);

    if (input.media !== undefined) {
      // Eliminar media anterior y guardar la nueva (simplificado)
      await this.mediaRepo.delete({ adId: ad.id });
      if (input.media.length > 0) {
        const mediaEntities = input.media.map((m) =>
          this.mediaRepo.create({ adId: ad.id, url: m.url, type: m.type, thumbnailUrl: m.thumbnailUrl }),
        );
        await this.mediaRepo.save(mediaEntities);
      }
    }

    return this.reloadLocalAd(ad.id);
  }
}
