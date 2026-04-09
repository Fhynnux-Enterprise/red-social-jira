import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { JobOffer } from './job-offer.entity';

@ObjectType()
@Entity({ name: 'job_offer_media' })
export class JobOfferMedia {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid', { name: 'id_job_offer_media' })
  id_job_offer_media: string;

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
  @CreateDateColumn()
  createdAt: Date;

  @Field({ nullable: true })
  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => JobOffer, jobOffer => jobOffer.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_job_offer' })
  jobOffer: JobOffer;

  @Column({ name: 'id_job_offer' })
  id_job_offer: string;
}
