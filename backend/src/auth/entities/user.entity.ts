import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Post } from '../../posts/entities/post.entity';

@ObjectType()
@Entity('users')
export class User {
    @Field(() => ID)
    @PrimaryColumn('uuid', { name: 'id_user' })
    id: string;

    @Field()
    @Column({ unique: true })
    email: string;

    @Field()
    @Column({ unique: true })
    username: string;

    @Field()
    @Column()
    firstName: string;

    @Field()
    @Column()
    lastName: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    photoUrl: string;

    @Column({ default: 'USER' })
    role: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    @Field(() => [Post], { nullable: true })
    @OneToMany(() => Post, (post) => post.author)
    posts: Post[];
}
