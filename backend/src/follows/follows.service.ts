import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class FollowsService {
    constructor(
        @InjectRepository(Follow)
        private readonly followRepository: Repository<Follow>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async toggleFollow(id_follower: string, id_following: string): Promise<boolean> {
        if (id_follower === id_following) {
            throw new BadRequestException('No puedes seguirte a ti mismo');
        }

        const existingFollow = await this.followRepository.findOne({
            where: { id_follower, id_following }
        });

        if (existingFollow) {
            await this.followRepository.remove(existingFollow);
            return false;
        } else {
            const newFollow = this.followRepository.create({
                id_follower,
                id_following
            });
            await this.followRepository.save(newFollow);
            return true;
        }
    }

    async isFollowing(id_follower: string, id_following: string): Promise<boolean> {
        const follow = await this.followRepository.findOne({
            where: { id_follower, id_following }
        });
        return !!follow;
    }

    async getFollowers(id_user: string): Promise<User[]> {
        const follows = await this.followRepository.find({
            where: { id_following: id_user },
            relations: ['follower']
        });
        return follows.map(f => f.follower);
    }

    async getFollowing(id_user: string): Promise<User[]> {
        const follows = await this.followRepository.find({
            where: { id_follower: id_user },
            relations: ['following']
        });
        return follows.map(f => f.following);
    }

    async getFollowersCount(id_user: string): Promise<number> {
        return this.followRepository.count({ where: { id_following: id_user } });
    }

    async getFollowingCount(id_user: string): Promise<number> {
        return this.followRepository.count({ where: { id_follower: id_user } });
    }

    async getOnlineFollowing(id_user: string): Promise<User[]> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const follows = await this.followRepository
            .createQueryBuilder('follow')
            .innerJoinAndSelect('follow.following', 'following')
            .where('follow.id_follower = :id_user', { id_user })
            .andWhere('following.lastActiveAt > :fiveMinutesAgo', { fiveMinutesAgo })
            .orderBy('following.lastActiveAt', 'DESC')
            .take(30) // Límite de seguridad para el carrusel
            .getMany();
            
        return follows.map(f => f.following);
    }

    async getOnlineFollowingCount(id_user: string): Promise<number> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        return this.followRepository
            .createQueryBuilder('follow')
            .innerJoin('follow.following', 'following')
            .where('follow.id_follower = :id_user', { id_user })
            .andWhere('following.lastActiveAt > :fiveMinutesAgo', { fiveMinutesAgo })
            .getCount();
    }
}
