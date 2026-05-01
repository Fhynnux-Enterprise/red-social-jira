import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('advertisements')
@ObjectType()
export class Advertisement {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ name: 'business_name' })
  @Field()
  businessName: string;

  @Column({ type: 'text' })
  @Field()
  content: string;

  @Column({ name: 'image_url', nullable: true })
  @Field({ nullable: true })
  imageUrl?: string;

  @Column({ name: 'redirect_url', nullable: true })
  @Field({ nullable: true })
  redirectUrl?: string;

  @Column({ name: 'is_active', default: true })
  @Field()
  isActive: boolean;

  @Column({ default: 0 })
  @Field(() => Int)
  views: number;

  @Column({ default: 0 })
  @Field(() => Int)
  clicks: number;

  @Column({ name: 'start_date', type: 'timestamptz' })
  @Field()
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  @Field()
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
