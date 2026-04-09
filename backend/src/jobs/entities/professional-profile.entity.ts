import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity()
export class ProfessionalProfile {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid', { name: 'id_professional_profile' })
  id_professional_profile: string;

  @Field()
  @Column()
  profession: string;

  @Field()
  @Column('text')
  description: string;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  experienceYears?: number;

  @Field()
  @Column()
  contactPhone: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => User)
  @OneToOne(() => User, (user) => user.professionalProfile, { eager: true })
  @JoinColumn({ name: 'id_user' })
  user: User;

  @Column({ name: 'id_user' })
  id_user: string;
}
