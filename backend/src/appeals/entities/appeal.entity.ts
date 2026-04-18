import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { AppealStatus, AppealType } from '../enums/appeal.enums';

@ObjectType()
@Entity('appeals')
export class Appeal {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @Column({ type: 'text' })
    reason: string;

    @Field(() => AppealStatus)
    @Column({
        type: 'enum',
        enum: AppealStatus,
        default: AppealStatus.PENDING,
    })
    status: AppealStatus;

    @Field(() => AppealType)
    @Column({
        type: 'enum',
        enum: AppealType,
    })
    type: AppealType;

    @Field(() => ID, { nullable: true })
    @Column({ name: 'reference_id', type: 'uuid', nullable: true })
    referenceId: string;

    @Field(() => User)
    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Field(() => Date)
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
