import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ProfessionalProfileMedia } from './professional-profile-media.entity';

@ObjectType()
@Entity('professional_profiles')
export class ProfessionalProfile {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  profession: string;

  @Field()
  @Column('text')
  description: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'experience_years', nullable: true })
  experienceYears?: number;

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
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Field(() => [ProfessionalProfileMedia], { nullable: true })
  @OneToMany(() => ProfessionalProfileMedia, media => media.professionalProfile, { cascade: true, eager: true, orphanedRowAction: 'delete' })
  media?: ProfessionalProfileMedia[];
}
