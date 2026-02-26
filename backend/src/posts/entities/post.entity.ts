import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('posts')
export class Post {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid', { name: 'id_post' })
    id: string;

    @Field()
    @Column('text')
    content: string;

    @Field(() => User)
    @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id_user' })
    author: User;

    @Field()
    @Column({ name: 'id_user' })
    authorId: string;

    @Field()
    @CreateDateColumn()
    createdAt: Date;
}
