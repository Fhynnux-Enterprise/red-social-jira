import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UserCustomField } from './entities/user-custom-field.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../auth/entities/user.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Post } from '../posts/entities/post.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../jobs/entities/professional-profile.entity';
import { Report } from '../reports/entities/report.entity';
import { ReportStatus, ReportedItemType } from '../reports/enums/report.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserCustomField)
    private readonly customFieldRepository: Repository<UserCustomField>,
    @InjectRepository(UserBadge)
    private readonly badgeRepository: Repository<UserBadge>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
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

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.createQueryBuilder('user')
      .where('user.id = :id', { id })
      .leftJoinAndSelect('user.customFields', 'customFields')
      .leftJoinAndSelect('user.badge', 'badge')
      .getOne();
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

    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    if (coverUrl !== undefined) user.coverUrl = coverUrl;

    return this.userRepository.save(user);
  }

  async searchUsers(searchTerm: string, currentUserId: string, limit: number = 5, offset: number = 0): Promise<User[]> {
    if (!searchTerm) return [];

    return this.userRepository.createQueryBuilder('user')
      .where('(user.username ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term)', { term: `%${searchTerm}%` })
      .andWhere('user.id != :currentUserId', { currentUserId })
      .andWhere('(user.bannedUntil IS NULL OR user.bannedUntil < :now)', { now: new Date() })
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
}
