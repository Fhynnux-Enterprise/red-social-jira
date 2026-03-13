import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Comment } from './comment.entity';

@ObjectType()
@Entity('comment_likes')
@Unique(['userId', 'commentId'])
export class CommentLike {
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

    @Field(() => Comment)
    @ManyToOne(() => Comment, comment => comment.likes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_comment' })
    comment: Comment;

    @Field()
    @Column({ name: 'id_comment' })
    commentId: string;

    @Field()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
