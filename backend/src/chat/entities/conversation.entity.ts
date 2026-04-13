import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Participant } from './participant.entity';
import { Message } from './message.entity';

@ObjectType()
@Entity('conversations')
export class Conversation {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Field()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @Field(() => [Participant], { nullable: true })
    @OneToMany(() => Participant, (participant) => participant.conversation)
    participants: Participant[];

    @Field(() => [Message], { nullable: true })
    @OneToMany(() => Message, (message) => message.conversation)
    messages: Message[];

    @Field(() => Message, { nullable: true })
    lastMessage?: Message;

    @Field(() => Number, { nullable: true })
    unreadCount?: number;
}
