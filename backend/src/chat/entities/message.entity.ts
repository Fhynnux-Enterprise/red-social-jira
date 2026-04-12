import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';

@ObjectType()
@Entity('messages')
export class Message {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @Column({ type: 'text' })
    content: string;

    @Field({ nullable: true })
    @Column({ name: 'image_url', type: 'text', nullable: true })
    imageUrl: string;

    @Field({ nullable: true })
    @Column({ name: 'video_url', type: 'text', nullable: true })
    videoUrl: string;

    @Field({ nullable: true })
    @Column({ name: 'story_id', type: 'text', nullable: true })
    storyId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Field()
    @Column({ name: 'conversation_id' })
    conversationId: string;

    @Field()
    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Field()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Field(() => [String], { nullable: true })
    @Column('text', { name: 'deleted_for', array: true, default: [] })
    deletedFor: string[];

    @Field({ defaultValue: false })
    @Column({ name: 'is_deleted_for_all', default: false })
    isDeletedForAll: boolean;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
    editedAt: Date;

    @Field(() => User)
    @ManyToOne(() => User, (user) => user.sentMessages)
    @JoinColumn({ name: 'user_id' })
    sender: User;

    @Field(() => Conversation)
    @ManyToOne(() => Conversation, (conversation) => conversation.messages)
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;
}
