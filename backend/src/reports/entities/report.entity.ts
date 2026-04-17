import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { ReportStatus, ReportedItemType } from '../enums/report.enums';

@ObjectType()
@Entity('reports')
@Unique(['reporter', 'reportedItemId'])
export class Report {
    @Field(() => ID)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field()
    @Column({ type: 'text' })
    reason: string;

    @Field(() => ReportStatus)
    @Column({
        type: 'enum',
        enum: ReportStatus,
        default: ReportStatus.PENDING,
    })
    status: ReportStatus;

    @Field(() => ReportedItemType)
    @Column({
        name: 'reported_item_type',
        type: 'enum',
        enum: ReportedItemType,
    })
    reportedItemType: ReportedItemType;

    @Field(() => ID)
    @Column({ name: 'reported_item_id', type: 'uuid' })
    reportedItemId: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'moderator_note', type: 'text', nullable: true })
    moderatorNote?: string;

    @Field(() => Boolean, { nullable: true, defaultValue: false })
    @Column({ name: 'content_deleted', type: 'boolean', default: false })
    contentDeleted: boolean;

    @Field(() => User)
    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporter_id' })
    reporter: User;

    @Field(() => Date)
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
}
