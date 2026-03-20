import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('follows')
export class Follow {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid', { name: 'id_follow' })
    id_follow: string;

    @Field()
    @Column({ name: 'id_follower' })
    id_follower: string;

    @Field()
    @Column({ name: 'id_following' })
    id_following: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @Field(() => User)
    @ManyToOne(() => User, user => user.following, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_follower' })
    follower: User;

    @Field(() => User)
    @ManyToOne(() => User, user => user.followers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_following' })
    following: User;
}
