import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { LocalAd } from '../advertisers/entities/local-ad.entity';
import { SystemConfig } from './entities/system-config.entity';
import { AdDecision } from './dto/ad-decision.type';

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(LocalAd)
    private readonly localAdRepo: Repository<LocalAd>,
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  /**
   * Determina qué anuncio mostrar basado en una probabilidad dinámica.
   * Implementa el modelo "Inventario Directo con Backfill".
   * Fuente de anuncios locales: tabla `local_ads` (sistema nuevo).
   */
  async getNextAdDecision(cityId?: string): Promise<AdDecision> {
    // 1. Obtener probabilidad local de la configuración (default 70%)
    const config = await this.configRepository.findOne({ where: { key: 'local_ad_probability' } });
    const localProbability = config ? parseInt(config.value, 10) : 70;

    // 2. Determinar si mostramos local o backfill (AdMob)
    const random = Math.floor(Math.random() * 100) + 1;

    if (random <= localProbability) {
      // 3. Buscar anuncios locales de anunciantes con permisos activos y no expirados
      const query = this.localAdRepo.createQueryBuilder('ad')
        .leftJoinAndSelect('ad.media', 'media')
        .innerJoinAndSelect('ad.advertiser', 'advertiser')
        .innerJoin('advertiser_permissions', 'perm', 'perm.user_id = ad.advertiser_id')
        .where('ad.is_active = :isActive', { isActive: true })
        .andWhere('perm.is_active = :permActive', { permActive: true })
        .andWhere('perm.expires_at > :now', { now: new Date() });

      if (cityId) {
        query.andWhere('ad.cityId = :cityId', { cityId });
      }

      const localAds = await query.getMany();

      if (localAds.length > 0) {
        // 4. Seleccionar uno al azar
        const selected = localAds[Math.floor(Math.random() * localAds.length)];

        // Incrementar vistas de forma asíncrona para no retrasar la respuesta
        this.localAdRepo.increment({ id: selected.id }, 'views', 1);

        return { type: 'LOCAL', localAd: selected };
      }
    }

    // 5. Fallback a AdMob si el azar lo decide o no hay anuncios locales disponibles
    return { type: 'ADMOB', localAd: undefined };
  }

  /**
   * Registra un click en un anuncio local específico.
   */
  async registerAdClick(adId: string): Promise<boolean> {
    const result = await this.localAdRepo.increment({ id: adId }, 'clicks', 1);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Obtiene la frecuencia de anuncios (cada cuántos posts aparece uno).
   */
  async getAdFrequency(): Promise<number> {
    const config = await this.configRepository.findOne({ where: { key: 'ad_frequency' } });
    return config ? parseInt(config.value, 10) : 5;
  }

  /**
   * Actualiza la frecuencia de anuncios.
   */
  async updateAdFrequency(frequency: number): Promise<boolean> {
    const key = 'ad_frequency';
    let config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      config = this.configRepository.create({ key, value: frequency.toString() });
    } else {
      config.value = frequency.toString();
    }
    await this.configRepository.save(config);
    return true;
  }

  /**
   * Obtiene el porcentaje de probabilidad de anuncios locales (0-100).
   */
  async getAdProbability(): Promise<number> {
    const config = await this.configRepository.findOne({ where: { key: 'local_ad_probability' } });
    if (!config) return 70;
    const val = parseInt(config.value, 10);
    return isNaN(val) ? 70 : val;
  }

  /**
   * Actualiza el porcentaje de anuncios locales vs AdMob.
   */
  async updateAdProbability(probability: number): Promise<boolean> {
    const key = 'local_ad_probability';
    let config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      config = this.configRepository.create({ key, value: probability.toString() });
    } else {
      config.value = probability.toString();
    }
    await this.configRepository.save(config);
    return true;
  }
}
