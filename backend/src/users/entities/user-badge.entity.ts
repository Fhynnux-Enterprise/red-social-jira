import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('user_badges')
export class UserBadge {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid', { name: 'id_badge' })
    id: string;

    @Field()
    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Field()
    @Column({ type: 'varchar', length: 50, default: 'default' })
    theme: string;

    @OneToOne(() => User, user => user.badge, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_user' })
    user: User;
}
