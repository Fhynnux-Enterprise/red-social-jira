import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Comment } from './comment.entity';
import { City } from '../../cities/entities/city.entity';

@ObjectType()
@Entity('comment_likes')
@Unique(['userId', 'commentId'])
export class CommentLike {
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

    @Field(() => Comment)
    @ManyToOne(() => Comment, comment => comment.likes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'comment_id' })
    comment: Comment;

    @Field()
    @Column({ name: 'comment_id' })
    commentId: string;

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
