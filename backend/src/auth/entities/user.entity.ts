import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, OneToOne } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Post } from '../../posts/entities/post.entity';
import { UserCustomField } from '../../users/entities/user-custom-field.entity';
import { UserBadge } from '../../users/entities/user-badge.entity';


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

    @Field({ nullable: true })
    @Column({ nullable: true })
    phone: string;

    @Field({ nullable: true })
    @Column({ type: 'text', nullable: true })
    bio: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    photoUrl: string;

    @Column({ default: 'USER' })
    role: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamptz' })
    deletedAt: Date;

    @Field(() => [Post], { nullable: true })
    @OneToMany(() => Post, (post) => post.author)
    posts: Post[];

    @Field(() => [UserCustomField], { nullable: true })
    @OneToMany(() => UserCustomField, (customField) => customField.author)
    customFields: UserCustomField[];

    @Field(() => UserBadge, { nullable: true })
    @OneToOne(() => UserBadge, badge => badge.user)
    badge: UserBadge;
}
