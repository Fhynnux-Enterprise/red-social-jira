import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column, JoinColumn, Unique } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { StoreProductComment } from './store-product-comment.entity';

@ObjectType()
@Entity('store_product_comment_likes')
@Unique(['userId', 'commentId'])
export class StoreProductCommentLike {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => StoreProductComment, (comment) => comment.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: StoreProductComment;

  @Field()
  @Column({ name: 'comment_id' })
  commentId: string;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
