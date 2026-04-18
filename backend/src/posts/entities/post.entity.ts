import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PostLike } from './post-like.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { PostMedia } from './post-media.entity';

@ObjectType()
@Entity('posts')
export class Post {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @Column('text')
    content: string;

    @Field({ nullable: true })
    @Column({ type: 'varchar', nullable: true })
    title?: string;

    @Field(() => [PostMedia], { nullable: 'itemsAndList' })
    @OneToMany(() => PostMedia, media => media.post, { cascade: true })
    media?: PostMedia[];

    @Field(() => User)
    @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    author: User;

    @Field()
    @Column({ name: 'user_id' })
    authorId: string;

    @Field(() => [PostLike], { nullable: true })
    @OneToMany(() => PostLike, like => like.post)
    likes?: PostLike[];

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Field()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Field({ nullable: true })
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt?: Date;

    @Field({ nullable: true })
    @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
    editedAt?: Date;

    @Field(() => [Comment], { nullable: true })
    @OneToMany(() => Comment, comment => comment.post)
    comments: Comment[];

    @Field(() => Number, { defaultValue: 0 })
    commentsCount?: number;
}
