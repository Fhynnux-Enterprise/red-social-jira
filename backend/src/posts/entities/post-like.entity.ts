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
    @JoinColumn({ name: 'id_user' })
    user: User;

    @Field()
    @Column({ name: 'id_user' })
    userId: string;

    @Field(() => Post)
    @ManyToOne(() => Post, post => post.likes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_post' })
    post: Post;

    @Field()
    @Column({ name: 'id_post' })
    postId: string;

    @Field()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
