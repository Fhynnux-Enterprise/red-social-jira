import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProfessionalProfile } from './professional-profile.entity';

@ObjectType()
@Entity('professional_profile_media')
export class ProfessionalProfileMedia {
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

  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => ProfessionalProfile, profile => profile.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professional_profile_id' })
  professionalProfile: ProfessionalProfile;

  @Column({ name: 'professional_profile_id' })
  professionalProfileId: string;
}
