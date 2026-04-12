import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('follows')
export class Follow {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @Column({ name: 'follower_id' })
    followerId: string;

    @Field()
    @Column({ name: 'following_id' })
    followingId: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Field(() => User)
    @ManyToOne(() => User, user => user.following, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'follower_id' })
    follower: User;

    @Field(() => User)
    @ManyToOne(() => User, user => user.followers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'following_id' })
    following: User;
}
