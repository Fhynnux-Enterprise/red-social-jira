import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity()
export class JobOffer {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid', { name: 'id_job_offer' })
  id_job_offer: string;

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
  @Column()
  contactPhone: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'id_user' })
  author: User;

  @Column({ name: 'id_user' })
  id_user: string;
}
