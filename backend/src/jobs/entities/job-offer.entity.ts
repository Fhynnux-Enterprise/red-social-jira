import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { JobOfferMedia } from './job-offer-media.entity';

@ObjectType()
@Entity('job_offers')
export class JobOffer {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column('text')
  description: string;

  @Field()
  @Column()
  location: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  salary?: string;

  @Field()
  @Column({ name: 'contact_phone' })
  contactPhone: string;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  author: User;

  @Column({ name: 'user_id' })
  authorId: string;

  @Field(() => [JobOfferMedia], { nullable: true })
  @OneToMany(() => JobOfferMedia, media => media.jobOffer, { cascade: true, eager: true })
  media?: JobOfferMedia[];
}
