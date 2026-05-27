import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { User } from '../auth/entities/user.entity';
import { UserBlock } from '../user-blocks/entities/user-block.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification.enums';

@Injectable()
export class FollowsService {
    constructor(
        @InjectRepository(Follow)
        private readonly followRepository: Repository<Follow>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly notificationsService: NotificationsService,
    ) { }

    async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
        if (followerId === followingId) {
            throw new BadRequestException('No puedes seguirte a ti mismo');
        }

        const existingFollow = await this.followRepository.findOne({
            where: { followerId, followingId }
        });

        if (existingFollow) {
            await this.followRepository.remove(existingFollow);
            return false;
        } else {
            const newFollow = this.followRepository.create({
                followerId,
                followingId
            });
            await this.followRepository.save(newFollow);

            // Fetch follower details
            const follower = await this.userRepository.findOne({
                where: { id: followerId }
            });

            if (follower) {
                const followerName = `${follower.firstName} ${follower.lastName}`.trim() || 'Un usuario';
                const title = `¡Tienes un nuevo seguidor!`;
                const body = `${followerName} comenzó a seguirte.`;
                const payload = {
                    type: 'USER_PROFILE',
                    userId: follower.id,
                    senderAvatar: follower.photoUrl || null,
                    senderName: followerName
                };

                // Save in-app notification in DB
                this.notificationsService.createNotification(
                    followingId,
                    title,
                    body,
                    NotificationType.SOCIAL,
                    JSON.stringify(payload)
                ).catch(err => {
                    console.error('[FollowsService] Error saving in-app notification:', err);
                });

                // Send Push Notification
                this.notificationsService.sendPushNotification(
                    followingId,
                    title,
                    body,
                    payload
                ).catch(err => {
                    console.error('[FollowsService] Error sending push notification:', err);
                });
            }

            return true;
        }
    }

    async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        const follow = await this.followRepository.findOne({
            where: { followerId, followingId }
        });
        return !!follow;
    }

    async getFollowers(userId: string): Promise<User[]> {
        const follows = await this.followRepository.find({
            where: { followingId: userId },
            relations: ['follower']
        });
        return follows.map(f => f.follower);
    }

    async getFollowing(userId: string): Promise<User[]> {
        const follows = await this.followRepository.find({
            where: { followerId: userId },
            relations: ['following']
        });
        return follows.map(f => f.following);
    }

    async getFollowersCount(userId: string): Promise<number> {
        return this.followRepository.count({ where: { followingId: userId } });
    }

    async getFollowingCount(userId: string): Promise<number> {
        return this.followRepository.count({ where: { followerId: userId } });
    }

    async getOnlineFollowing(userId: string): Promise<User[]> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const follows = await this.followRepository
            .createQueryBuilder('follow')
            .innerJoinAndSelect('follow.following', 'following')
            .where('follow.followerId = :userId', { userId })
            .andWhere('following.lastActiveAt > :fiveMinutesAgo', { fiveMinutesAgo })
            // Filtro de invisibilidad bidireccional por bloqueos
            .andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from(UserBlock, 'ub')
                    .where('(ub.blockerId = :userId AND ub.blockedId = following.id) OR (ub.blockerId = following.id AND ub.blockedId = :userId)')
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            })
            .orderBy('following.lastActiveAt', 'DESC')
            .take(30)
            .getMany();
            
        return follows.map(f => f.following);
    }

    async getOnlineFollowingCount(userId: string): Promise<number> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        return this.followRepository
            .createQueryBuilder('follow')
            .innerJoin('follow.following', 'following')
            .where('follow.followerId = :userId', { userId })
            .andWhere('following.lastActiveAt > :fiveMinutesAgo', { fiveMinutesAgo })
            // Filtro de invisibilidad bidireccional por bloqueos
            .andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from(UserBlock, 'ub')
                    .where('(ub.blockerId = :userId AND ub.blockedId = following.id) OR (ub.blockerId = following.id AND ub.blockedId = :userId)')
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            })
            .getCount();
    }
}
