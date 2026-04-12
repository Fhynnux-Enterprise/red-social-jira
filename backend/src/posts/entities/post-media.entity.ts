import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Post } from './post.entity';

@ObjectType()
@Entity('post_media')
export class PostMedia {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @Column('text')
    url: string;

    @Field()
    @Column('varchar', { length: 50 })
    type: string;

    @Field(() => Int)
    @Column('int')
    order: number;

    @Field(() => Post)
    @ManyToOne(() => Post, post => post.media, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'post_id' })
    post: Post;

    @Column({ name: 'post_id' })
    postId: string;

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt: Date;
}
