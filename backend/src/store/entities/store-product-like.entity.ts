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
import { City } from '../../cities/entities/city.entity';

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

  // ── Multi-tenant: City isolation ───────────────────────────────────────
  @Field()
  @Column({ name: 'city_id', default: 'chunchi' })
  cityId: string;

  @Field(() => City, { nullable: true })
  @ManyToOne(() => City, { eager: false, nullable: true })
  @JoinColumn({ name: 'city_id' })
  city?: City;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
