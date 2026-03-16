import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';

@ObjectType()
@Entity('participants')
export class Participant {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid', { name: 'id_participant' })
    id_participant: string;

    @Column({ name: 'id_user' })
    id_user: string;

    @Column({ name: 'id_conversation' })
    id_conversation: string;

    @Field(() => ID, { nullable: true })
    @Column({ type: 'uuid', name: 'id_last_read_message', nullable: true })
    id_last_read_message: string;

    @Field()
    @CreateDateColumn({ type: 'timestamptz' })
    joinedAt: Date;

    @Field(() => User)
    @ManyToOne(() => User, (user) => user.participations)
    @JoinColumn({ name: 'id_user' })
    user: User;

    @Field(() => Conversation)
    @ManyToOne(() => Conversation, (conversation) => conversation.participants)
    @JoinColumn({ name: 'id_conversation' })
    conversation: Conversation;
}
