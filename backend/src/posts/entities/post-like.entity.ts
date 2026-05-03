import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Post } from './post.entity';
import { City } from '../../cities/entities/city.entity';

@ObjectType()
@Entity('post_likes')
@Unique(['userId', 'postId'])
export class PostLike {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field(() => User)
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Field()
    @Column({ name: 'user_id' })
    userId: string;

    @Field(() => Post)
    @ManyToOne(() => Post, post => post.likes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'post_id' })
    post: Post;

    @Field()
    @Column({ name: 'post_id' })
    postId: string;

    // ── Multi-tenant: City isolation ──────────────────────────────────────
    @Field()
    @Column({ name: 'city_id', default: 'chunchi' })
    cityId: string;

    @Field(() => City, { nullable: true })
    @ManyToOne(() => City, { eager: false, nullable: true })
    @JoinColumn({ name: 'city_id' })
    city?: City;

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
