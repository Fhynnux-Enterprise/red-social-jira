import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Post } from './post.entity';

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

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
