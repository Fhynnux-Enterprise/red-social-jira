import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { StoreProduct } from './store-product.entity';
import { StoreProductCommentLike } from './store-product-comment-like.entity';
import { Int } from '@nestjs/graphql';

@ObjectType()
@Entity('store_product_comments')
export class StoreProductComment {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column('text')
  content: string;

  @Field(() => StoreProduct)
  @ManyToOne(() => StoreProduct, (product) => product.comments, { onDelete: 'CASCADE' })
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

  @Field()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Field(() => [StoreProductCommentLike], { nullable: true })
  @OneToMany(() => StoreProductCommentLike, (like) => like.comment)
  likes: StoreProductCommentLike[];

  @Field(() => Int, { defaultValue: 0 })
  likesCount?: number;

  @Field(() => Boolean, { defaultValue: false })
  isLikedByMe?: boolean;

  @Field(() => StoreProductComment, { nullable: true })
  @ManyToOne(() => StoreProductComment, comment => comment.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: StoreProductComment;

  @Field({ nullable: true })
  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @Field(() => [StoreProductComment], { nullable: true })
  @OneToMany(() => StoreProductComment, comment => comment.parent)
  replies?: StoreProductComment[];

  @Field({ nullable: true })
  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt?: Date;

  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
