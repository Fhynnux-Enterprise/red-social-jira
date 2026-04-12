import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { JobOffer } from './job-offer.entity';

export enum ApplicationStatus {
  PENDING  = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

registerEnumType(ApplicationStatus, {
  name: 'ApplicationStatus',
  description: 'Estado de una postulación a una oferta de empleo',
});

@ObjectType()
@Entity('job_applications')
export class JobApplication {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  message?: string;

  @Field({ nullable: true })
  @Column({ name: 'cv_url', nullable: true })
  cvUrl?: string;

  @Field(() => ApplicationStatus)
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ── Relaciones ──────────────────────────────────────────

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  applicant: User;

  @Column({ name: 'user_id' })
  applicantId: string;

  @Field(() => JobOffer)
  @ManyToOne(() => JobOffer, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_offer_id' })
  jobOffer: JobOffer;

  @Column({ name: 'job_offer_id' })
  jobOfferId: string;
}
