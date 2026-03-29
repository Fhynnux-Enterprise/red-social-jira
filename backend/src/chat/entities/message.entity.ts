import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';

@ObjectType()
@Entity('messages')
export class Message {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid', { name: 'id_message' })
    id_message: string;

    @Field()
    @Column({ type: 'text' })
    content: string;

    @Field({ nullable: true })
    @Column({ type: 'text', nullable: true })
    imageUrl: string;

    @Field({ nullable: true })
    @Column({ type: 'text', nullable: true })
    videoUrl: string;

    @Field({ nullable: true })
    @Column({ type: 'text', nullable: true })
    storyId: string;

    @Column({ name: 'id_user' })
    id_user: string;

    @Field()
    @Column({ name: 'id_conversation' })
    id_conversation: string;

    @Field()
    @Column({ default: false })
    isRead: boolean;

    @Field()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @Field()
    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @Field(() => [String], { nullable: true })
    @Column("text", { array: true, default: [] })
    deletedFor: string[];

    @Field({ defaultValue: false })
    @Column({ default: false })
    isDeletedForAll: boolean;

    @Field(() => Date, { nullable: true })
    @Column({ type: 'timestamptz', nullable: true })
    editedAt: Date;

    @Field(() => User)
    @ManyToOne(() => User, (user) => user.sentMessages)
    @JoinColumn({ name: 'id_user' })
    sender: User;

    @Field(() => Conversation)
    @ManyToOne(() => Conversation, (conversation) => conversation.messages)
    @JoinColumn({ name: 'id_conversation' })
    conversation: Conversation;
}
