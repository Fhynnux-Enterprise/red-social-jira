import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { StoreProduct } from './store-product.entity';

@ObjectType()
@Entity('store_product_likes')
export class StoreProductLike {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => StoreProduct)
  @ManyToOne(() => StoreProduct, (product) => product.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_product_id' })
  product: StoreProduct;

  @Column({ name: 'store_product_id' })
  storeProductId: string;

  @Field(() => User)
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
