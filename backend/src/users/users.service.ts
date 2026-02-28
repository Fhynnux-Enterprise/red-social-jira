import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UserCustomField } from './entities/user-custom-field.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserCustomField)
    private readonly customFieldRepository: Repository<UserCustomField>,
    @InjectRepository(UserBadge)
    private readonly badgeRepository: Repository<UserBadge>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}
