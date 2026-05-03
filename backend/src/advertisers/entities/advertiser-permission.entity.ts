import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
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
import { City } from '../../cities/entities/city.entity';

@Entity('advertiser_permissions')
@ObjectType()
export class AdvertiserPermission {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ name: 'user_id' })
  @Field()
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  @Field(() => User)
  user: User;

  @Column({ name: 'is_active', default: true })
  @Field()
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  @Field()
  expiresAt: Date;

  @Column({ name: 'max_ads', default: 5 })
  @Field(() => Int)
  maxAds: number;

  @Column({ name: 'granted_by', nullable: true })
  @Field({ nullable: true })
  grantedBy?: string;

  // ── Multi-tenant: City isolation ───────────────────────────────────────
  @Column({ name: 'city_id', default: 'chunchi' })
  @Field()
  cityId: string;

  @ManyToOne(() => City, { eager: false, nullable: true })
  @JoinColumn({ name: 'city_id' })
  @Field(() => City, { nullable: true })
  city?: City;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Field()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
