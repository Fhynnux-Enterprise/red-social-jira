import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('user_custom_fields')
export class UserCustomField {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  value: string;

  @Field()
  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @Column({ name: 'user_id' })
  authorId: string;

  @ManyToOne(() => User, (user) => user.customFields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  author: User;
}
