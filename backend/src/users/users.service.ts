import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UserCustomField } from './entities/user-custom-field.entity';
import { UserBadge } from './entities/user-badge.entity';
import { VerificationType } from './entities/verification-type.entity';
import { UserTier } from './entities/user-tier.entity';
import { CreateUserTierInput, UpdateUserTierInput } from './dto/user-tier.input';
import { User } from '../auth/entities/user.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Post } from '../posts/entities/post.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { StoreProductComment } from '../store/entities/store-product-comment.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';
import { Report } from '../reports/entities/report.entity';
import { ReportStatus, ReportedItemType } from '../reports/enums/report.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';
import { VisionService } from '../storage/vision.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserCustomField)
    private readonly customFieldRepository: Repository<UserCustomField>,
    @InjectRepository(UserBadge)
    private readonly badgeRepository: Repository<UserBadge>,
    @InjectRepository(VerificationType)
    private readonly verificationTypeRepository: Repository<VerificationType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTier)
    private readonly userTierRepository: Repository<UserTier>,
    private readonly notificationsService: NotificationsService,
    private readonly visionService: VisionService,
  ) { }

  async addCustomField(
    userId: string,
    title: string,
    value: string,
  ): Promise<UserCustomField> {
    // Validación 1: Límite de 5 campos
    const currentCount = await this.customFieldRepository.count({
      where: { authorId: userId },
    });

    if (currentCount >= 5) {
      throw new BadRequestException('Límite de 5 campos alcanzado');
    }

    const newField = this.customFieldRepository.create({
      title,
      value,
      authorId: userId,
      isVisible: true,
    });

    return this.customFieldRepository.save(newField);
  }

  async updateCustomField(
    userId: string,
    id: string,
    title: string,
    value: string,
  ): Promise<UserCustomField> {
    const field = await this.customFieldRepository.findOne({
      where: { id, authorId: userId },
    });
    if (!field) {
      throw new BadRequestException('Campo no encontrado o no tienes permiso');
    }
    field.title = title;
    field.value = value;
    return this.customFieldRepository.save(field);
  }

  async findById(id: string, cityId?: string): Promise<User> {
    const query = this.userRepository.createQueryBuilder('user')
      .where('user.id = :id', { id })
      .leftJoinAndSelect('user.customFields', 'customFields')
      .leftJoinAndSelect('user.badge', 'badge');

    if (cityId) {
        query.andWhere('user.cityId = :cityId', { cityId });
    }

    const user = await query.getOne();
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return user;
  }

  async deleteCustomField(userId: string, id: string): Promise<boolean> {
    const result = await this.customFieldRepository.delete({
      id,
      authorId: userId,
    });
    return (result.affected ?? 0) > 0;
  }

  async upsertBadge(
    userId: string,
    title: string,
    theme: string = 'default',
  ): Promise<UserBadge> {
    const existingBadge = await this.badgeRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existingBadge) {
      existingBadge.title = title;
      existingBadge.theme = theme;
      return this.badgeRepository.save(existingBadge);
    }

    const newBadge = this.badgeRepository.create({
      title,
      theme,
      user: { id: userId },
    });

    return this.badgeRepository.save(newBadge);
  }

  async updateProfile(
    userId: string,
    firstName?: string,
    lastName?: string,
    bio?: string,
    username?: string,
    phone?: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (username !== undefined && username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username, id: Not(userId) },
      });
      if (existingUser) {
        throw new BadRequestException('El nombre de usuario ya está en uso');
      }
      user.username = username;
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;

    return this.userRepository.save(user);
  }

  async updateProfileMedia(
    userId: string,
    photoUrl?: string,
    coverUrl?: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Validar seguridad de la foto de perfil si se actualiza
    if (photoUrl) {
      await this.visionService.validateImageSafety(photoUrl);
    }

    // Validar seguridad de la portada si se actualiza
    if (coverUrl) {
      await this.visionService.validateImageSafety(coverUrl);
    }

    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    if (coverUrl !== undefined) user.coverUrl = coverUrl;

    return this.userRepository.save(user);
  }

  async searchUsers(searchTerm: string, currentUserId: string, limit: number = 5, offset: number = 0, cityId?: string): Promise<User[]> {
    if (!searchTerm) return [];

    const query = this.userRepository.createQueryBuilder('user')
      .where('(user.username ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term)', { term: `%${searchTerm}%` })
      .andWhere('(user.bannedUntil IS NULL OR user.bannedUntil < :now)', { now: new Date() });

    if (cityId) {
        query.andWhere('user.cityId = :cityId', { cityId });
    }

    return query
      .take(limit)
      .skip(offset)
      .getMany();
  }

  async pingPresence(userId: string): Promise<boolean> {
    await this.userRepository.update({ id: userId }, { lastActiveAt: new Date() });
    return true;
  }

  async banUser(
    targetUserId: string,
    durationInDays: number,
    reason: string,
    wipeContent: boolean = false,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // 999 días se considera permanente (~273 años)
    const bannedUntil = new Date();
    bannedUntil.setDate(bannedUntil.getDate() + durationInDays);

    user.bannedUntil = bannedUntil;
    user.banReason = reason;

    const actionDesc = wipeContent ? 'con erradicación' : (durationInDays === 999 ? 'permanente' : `temporal de ${durationInDays} días`);
    const resolutionNote = `Resuelto automáticamente por suspensión de usuario (${actionDesc}). Motivo: ${reason}`;

    await this.userRepository.manager.transaction(async transactionalEntityManager => {
      const now = new Date();
      await transactionalEntityManager.save(user);

      if (wipeContent) {
        // Erradicación de contenido (Nuke) mediante Soft Delete
        await transactionalEntityManager.update(Post, { authorId: targetUserId }, { deletedAt: now });
        await transactionalEntityManager.update(StoreProduct, { sellerId: targetUserId }, { deletedAt: now });
        await transactionalEntityManager.update(JobOffer, { authorId: targetUserId }, { deletedAt: now });
        await transactionalEntityManager.update(ProfessionalProfile, { userId: targetUserId }, { deletedAt: now });
        await transactionalEntityManager.update(Comment, { userId: targetUserId }, { deletedAt: now });
        await transactionalEntityManager.update(StoreProductComment, { userId: targetUserId }, { deletedAt: now });
      }

      // Resolver las denuncias PENDIENTES hacia este perfil de usuario
      await transactionalEntityManager.update(Report, 
        { 
          reportedItemType: ReportedItemType.USER, 
          reportedItemId: targetUserId, 
          status: ReportStatus.PENDING 
        }, 
        { 
          status: ReportStatus.RESOLVED, 
          moderatorNote: resolutionNote, 
          contentDeleted: wipeContent 
        }
      );
    });

    await this.notificationsService.createNotification(
      targetUserId,
      'Tu cuenta ha sido suspendida',
      `Tu cuenta ha sido suspendida ${actionDesc}. Motivo: ${reason}`,
      NotificationType.MODERATION
    );

    return user;
  }

  async unbanUser(targetUserId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    await this.userRepository.manager.transaction(async transactionalEntityManager => {
      // 1. Quitar el baneo
      await transactionalEntityManager
        .createQueryBuilder()
        .update(User)
        .set({ bannedUntil: () => 'NULL', banReason: () => 'NULL' })
        .where('id = :id', { id: targetUserId })
        .execute();

      // 2. Restaurar el contenido (Quitar Soft Delete)
      await transactionalEntityManager.restore(Post, { authorId: targetUserId });
      await transactionalEntityManager.restore(StoreProduct, { sellerId: targetUserId });
      await transactionalEntityManager.restore(JobOffer, { authorId: targetUserId });
      await transactionalEntityManager.restore(ProfessionalProfile, { userId: targetUserId });
      await transactionalEntityManager.restore(Comment, { userId: targetUserId });
      await transactionalEntityManager.restore(StoreProductComment, { userId: targetUserId });
    });

    // Retornar el usuario actualizado
    return this.userRepository.findOne({ where: { id: targetUserId } }) as Promise<User>;
  }

  async getBannedUsers(limit: number = 15, offset: number = 0, searchTerm?: string): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.bannedUntil > :now', { now: new Date() });

    if (searchTerm) {
      query.andWhere('(user.username ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term)', { term: `%${searchTerm}%` });
    }

    return query
      .orderBy('user.bannedUntil', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany();
  }

  async getVerificationTypes(): Promise<VerificationType[]> {
    return this.verificationTypeRepository.find({ order: { name: 'ASC' } });
  }

  async getVerifiedUsers(limit: number = 15, offset: number = 0, searchTerm?: string): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.verificationType', 'verificationType');

    if (searchTerm) {
      query.andWhere('(user.username ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term)', { term: `%${searchTerm}%` });
    }

    return query
      .orderBy('user.username', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany();
  }

  async verifyUser(targetUserId: string, verificationTypeId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const verificationType = await this.verificationTypeRepository.findOne({ where: { id: verificationTypeId } });
    if (!verificationType) {
      throw new BadRequestException('Tipo de verificación no encontrado');
    }

    user.verificationType = verificationType;
    user.verificationTypeId = verificationTypeId;
    const updatedUser = await this.userRepository.save(user);

    try {
      await this.notificationsService.createNotification(
        targetUserId,
        'Cuenta verificada',
        `Tu cuenta ahora está verificada como: ${verificationType.name}`,
        NotificationType.MODERATION
      );
    } catch (error) {
      console.error('Error al enviar notificación de verificación:', error);
    }

    return updatedUser;
  }

  async unverifyUser(targetUserId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    user.verificationType = null;
    user.verificationTypeId = null;
    return this.userRepository.save(user);
  }

  async getVerificationTypeById(id: string): Promise<VerificationType | null> {
    return this.verificationTypeRepository.findOne({ where: { id } });
  }

  // ── RANGOS Y LÍMITES (USER TIERS) ─────────────────────────────────────────

  async getUserTiers(): Promise<UserTier[]> {
    return this.userTierRepository.find({ order: { name: 'ASC' } });
  }

  async getUserTierById(id: string): Promise<UserTier | null> {
    return this.userTierRepository.findOneBy({ id });
  }

  async createUserTier(input: CreateUserTierInput): Promise<UserTier> {
    const existing = await this.userTierRepository.findOneBy({ id: input.id });
    if (existing) {
      throw new BadRequestException(`El rango con identificador '${input.id}' ya existe.`);
    }

    const tier = this.userTierRepository.create(input);
    return this.userTierRepository.save(tier);
  }

  async updateUserTier(input: UpdateUserTierInput): Promise<UserTier> {
    const tier = await this.userTierRepository.findOneBy({ id: input.id });
    if (!tier) {
      throw new BadRequestException(`El rango con identificador '${input.id}' no existe.`);
    }

    if (input.name !== undefined) tier.name = input.name;
    if (input.maxCarouselItems !== undefined) tier.maxCarouselItems = input.maxCarouselItems;
    if (input.maxVideos !== undefined) tier.maxVideos = input.maxVideos;
    if (input.maxVideoDuration !== undefined) tier.maxVideoDuration = input.maxVideoDuration;
    if (input.maxVideoQuality !== undefined) tier.maxVideoQuality = input.maxVideoQuality;
    if (input.maxVideoBitrateKbps !== undefined) tier.maxVideoBitrateKbps = input.maxVideoBitrateKbps;
    if (input.maxUploadSizeMb !== undefined) tier.maxUploadSizeMb = input.maxUploadSizeMb;

    return this.userTierRepository.save(tier);
  }

  async deleteUserTier(id: string): Promise<boolean> {
    if (id === 'STANDARD') {
      throw new BadRequestException('No se puede eliminar el rango Estándar por defecto.');
    }

    const tier = await this.userTierRepository.findOneBy({ id });
    if (!tier) {
      throw new BadRequestException(`El rango con identificador '${id}' no existe.`);
    }

    await this.userRepository.update({ tierId: id }, { tierId: 'STANDARD' });
    await this.userTierRepository.delete(id);
    return true;
  }

  async assignUserTier(userId: string, tierId: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    const tier = await this.userTierRepository.findOneBy({ id: tierId });
    if (!tier) {
      throw new BadRequestException('El rango especificado no existe.');
    }

    user.tierId = tierId;
    await this.userRepository.save(user);

    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['verificationType', 'tier']
    });
    if (!updatedUser) {
      throw new BadRequestException('Error al recuperar el usuario modificado.');
    }
    return updatedUser;
  }

  async deleteAccount(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    await this.userRepository.manager.transaction(async transactionalEntityManager => {
      const now = new Date();
      
      // Desactivar usuario
      user.isActive = false;
      await transactionalEntityManager.save(user);
      
      // Soft-delete del usuario
      await transactionalEntityManager.softDelete(User, userId);

      // Erradicación de su contenido (Feed, Tienda, Empleos, Comentarios)
      await transactionalEntityManager.update(Post, { authorId: userId }, { deletedAt: now });
      await transactionalEntityManager.update(StoreProduct, { sellerId: userId }, { deletedAt: now });
      await transactionalEntityManager.update(JobOffer, { authorId: userId }, { deletedAt: now });
      await transactionalEntityManager.update(ProfessionalProfile, { userId: userId }, { deletedAt: now });
      await transactionalEntityManager.update(Comment, { userId: userId }, { deletedAt: now });
      await transactionalEntityManager.update(StoreProductComment, { userId: userId }, { deletedAt: now });
    });

    return true;
  }

  async reactivateAccount(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      withDeleted: true 
    });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    await this.userRepository.manager.transaction(async transactionalEntityManager => {
      // 1. Quitar soft-delete del usuario y reactivar
      await transactionalEntityManager.restore(User, userId);
      await transactionalEntityManager.update(User, userId, { isActive: true });

      // 2. Restaurar contenido (poner deletedAt en null)
      await transactionalEntityManager.update(Post, { authorId: userId }, { deletedAt: null as any });
      await transactionalEntityManager.update(StoreProduct, { sellerId: userId }, { deletedAt: null as any });
      await transactionalEntityManager.update(JobOffer, { authorId: userId }, { deletedAt: null as any });
      await transactionalEntityManager.update(ProfessionalProfile, { userId: userId }, { deletedAt: null as any });
      await transactionalEntityManager.update(Comment, { userId: userId }, { deletedAt: null as any });
      await transactionalEntityManager.update(StoreProductComment, { userId: userId }, { deletedAt: null as any });
    });

    return true;
  }

  async updateNotificationPreferences(
    userId: string,
    receiveSystem: boolean,
    receiveModeration: boolean,
    receiveSocial: boolean,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    user.receiveSystemNotifications = receiveSystem;
    user.receiveModerationNotifications = receiveModeration;
    user.receiveSocialNotifications = receiveSocial;

    return this.userRepository.save(user);
  }
}

