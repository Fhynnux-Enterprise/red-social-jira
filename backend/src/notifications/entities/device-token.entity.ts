import { Field, ObjectType } from '@nestjs/graphql';
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    JoinColumn
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('device_tokens')
export class DeviceToken {
    @Field(() => String)
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Field(() => String)
    @Column({ unique: true })
    token: string;

    @Field(() => String)
    @Column()
    userId: string;

    @Field(() => User)
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Field(() => String)
    @Column()
    cityId: string;

    @Field(() => String, { nullable: true })
    @Column({ nullable: true })
    platform: string;

    @Field(() => Date)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => Date)
    @UpdateDateColumn()
    lastUsedAt: Date;
}
