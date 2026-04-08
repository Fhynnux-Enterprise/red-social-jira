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
  @PrimaryGeneratedColumn('uuid', { name: 'id_job_application' })
  id_job_application: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  message?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  cvUrl?: string;

  @Field(() => ApplicationStatus)
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ── Relaciones ──────────────────────────────────────────

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'id_user' })
  applicant: User;

  @Column({ name: 'id_user' })
  id_user: string;

  @Field(() => JobOffer)
  @ManyToOne(() => JobOffer, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_job_offer' })
  jobOffer: JobOffer;

  @Column({ name: 'id_job_offer' })
  id_job_offer: string;
}
