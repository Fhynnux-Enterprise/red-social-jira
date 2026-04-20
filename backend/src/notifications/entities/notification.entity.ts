import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { NotificationType } from '../enums/notification.enums';

@ObjectType()
@Entity('notifications')
export class Notification {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Field()
    @Column({ type: 'text' })
    message: string;

    @Field(() => NotificationType)
    @Column({
        type: 'enum',
        enum: NotificationType,
        default: NotificationType.SYSTEM,
    })
    type: NotificationType;

    @Field(() => Boolean)
    @Column({ name: 'is_read', type: 'boolean', default: false })
    isRead: boolean;

    @Field(() => User)
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Field(() => Date)
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
