import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StoreProduct } from './store-product.entity';

@ObjectType()
@Entity('store_product_media')
export class StoreProductMedia {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  url: string;

  @Field()
  @Column({ type: 'enum', enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' })
  type: string;

  @Field(() => Int)
  @Column('int')
  order: number;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => StoreProduct, (p) => p.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: StoreProduct;

  @Column({ name: 'product_id' })
  productId: string;
}
