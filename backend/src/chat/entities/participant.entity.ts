import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';

@ObjectType()
@Entity('participants')
export class Participant {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'conversation_id' })
    conversationId: string;

    @Field(() => ID, { nullable: true })
    @Column({ name: 'last_read_message_id', type: 'uuid', nullable: true })
    lastReadMessageId: string;

    @Field()
    @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
    joinedAt: Date;

    @Field(() => User)
    @ManyToOne(() => User, (user) => user.participations)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Field(() => Conversation)
    @ManyToOne(() => Conversation, (conversation) => conversation.participants)
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;
}
