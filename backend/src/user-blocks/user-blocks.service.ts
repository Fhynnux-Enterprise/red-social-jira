import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBlock } from './entities/user-block.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class UserBlocksService {
  constructor(
    @InjectRepository(UserBlock)
    private readonly userBlockRepository: Repository<UserBlock>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async blockUser(blockerId: string, blockedId: string): Promise<UserBlock> {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const existingBlock = await this.userBlockRepository.findOne({
      where: { blockerId, blockedId },
    });

    if (existingBlock) {
      return existingBlock;
    }

    const newBlock = this.userBlockRepository.create({
      blockerId,
      blockedId,
    });

    return this.userBlockRepository.save(newBlock);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.userBlockRepository.delete({
      blockerId,
      blockedId,
    });

    return !!result.affected && result.affected > 0;
  }

  async getBlockedUsers(userId: string, limit: number = 20, offset: number = 0): Promise<User[]> {
    const blocks = await this.userBlockRepository.find({
      where: { blockerId: userId },
      relations: ['blocked'],
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return blocks.map((block) => block.blocked);
  }

  async getBlockedAndBlockerIds(userId: string): Promise<string[]> {
    const blocks = await this.userBlockRepository.find({
      where: [
        { blockerId: userId },
        { blockedId: userId },
      ],
    });

    const ids = new Set<string>();
    blocks.forEach((block) => {
      if (block.blockerId === userId) {
        ids.add(block.blockedId);
      } else {
        ids.add(block.blockerId);
      }
    });

    return Array.from(ids);
  }

  async checkIfBlocked(userA: string, userB: string): Promise<boolean> {
    const block = await this.userBlockRepository.findOne({
      where: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    });

    return !!block;
  }
}
