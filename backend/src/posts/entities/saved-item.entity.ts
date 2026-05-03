import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';

export enum SavedItemType {
  POST = 'POST',
  JOB_OFFER = 'JOB_OFFER',
  PROFESSIONAL_PROFILE = 'PROFESSIONAL_PROFILE',
  STORE_PRODUCT = 'STORE_PRODUCT',
  AD = 'AD'
}

registerEnumType(SavedItemType, {
  name: 'SavedItemType',
});

@ObjectType()
@Entity('saved_items')
@Unique(['userId', 'itemId', 'itemType'])
export class SavedItem {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field()
  @Column({ name: 'item_id' })
  itemId: string;

  @Field(() => SavedItemType)
  @Column({
    type: 'enum',
    enum: SavedItemType,
    name: 'item_type'
  })
  itemType: SavedItemType;

  @Field()
  @Column({ name: 'city_id' })
  cityId: string;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
