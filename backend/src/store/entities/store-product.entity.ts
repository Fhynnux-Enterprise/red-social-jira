import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { StoreProductMedia } from './store-product-media.entity';
import { StoreProductLike } from './store-product-like.entity';
import { StoreProductComment } from './store-product-comment.entity';

@ObjectType()
@Entity('store_products')
export class StoreProduct {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column('text')
  description: string;

  @Field(() => Float)
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  contactPhone?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  condition?: string; // 'new' | 'used' | 'like_new'

  @Field({ nullable: true })
  @Column({ nullable: true })
  category?: string;

  @Field()
  @Column({ default: true })
  isAvailable: boolean;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Field(() => [StoreProductMedia], { nullable: true })
  @OneToMany(() => StoreProductMedia, (m) => m.product, { cascade: true, eager: true })
  media?: StoreProductMedia[];

  @Field(() => [StoreProductLike], { nullable: true })
  @OneToMany(() => StoreProductLike, (like) => like.product, { cascade: true, eager: true })
  likes?: StoreProductLike[];

  @Field(() => [StoreProductComment], { nullable: true })
  @OneToMany(() => StoreProductComment, (comment) => comment.product, { cascade: true })
  comments?: StoreProductComment[];

  // This is a virtual field resolved manually by counting comments
  @Field(() => Float, { defaultValue: 0 })
  commentsCount?: number;
}
