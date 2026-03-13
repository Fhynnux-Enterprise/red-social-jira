import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';
import { CommentLike } from './comment-like.entity';

@ObjectType()
@Entity('comments')
export class Comment {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid', { name: 'id_comment' })
    id: string;

    @Field()
    @Column('text')
    content: string;

    @Field(() => User, { nullable: true })
    @ManyToOne(() => User, user => user.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_user' })
    user: User;

    @Field(() => [CommentLike], { nullable: true })
    @OneToMany(() => CommentLike, like => like.comment)
    likes: CommentLike[];

    @Field()
    @Column({ name: 'id_user' })
    userId: string;

    @Field(() => Post, { nullable: true })
    @ManyToOne(() => Post, post => post.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_post' })
    post: Post;

    @Field()
    @Column({ name: 'id_post' })
    postId: string;

    @Field({ nullable: true })
    @Column({ name: 'id_parent', nullable: true })
    parentId?: string;

    @Field(() => Comment, { nullable: true })
    @ManyToOne(() => Comment, comment => comment.replies, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_parent' })
    parent?: Comment;

    @Field(() => [Comment], { nullable: true })
    @OneToMany(() => Comment, comment => comment.parent)
    replies?: Comment[];

    @Field()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @Field()
    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @Field({ nullable: true })
    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    deletedAt?: Date;

    @Field(() => Number, { defaultValue: 0 })
    likesCount?: number;

    @Field(() => Boolean, { defaultValue: false })
    isLikedByMe?: boolean;
}
