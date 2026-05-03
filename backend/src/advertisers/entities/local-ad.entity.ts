import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { LocalAdMedia } from './local-ad-media.entity';
import { City } from '../../cities/entities/city.entity';

@Entity('local_ads')
@ObjectType()
export class LocalAd {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ name: 'advertiser_id' })
  @Field()
  advertiserId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'advertiser_id' })
  @Field(() => User)
  advertiser: User;

  @Column()
  @Field()
  title: string;

  @Column({ type: 'text' })
  @Field()
  description: string;

  @Column({ name: 'action_url', nullable: true })
  @Field({ nullable: true })
  actionUrl?: string;

  @Column({ name: 'action_label', default: 'Ver más' })
  @Field()
  actionLabel: string;

  @Column({ name: 'whatsapp_phone', nullable: true })
  @Field({ nullable: true })
  whatsappPhone?: string;

  @Column({ name: 'is_active', default: true })
  @Field()
  isActive: boolean;

  @Column({ default: 0 })
  @Field(() => Int)
  views: number;

  @Column({ default: 0 })
  @Field(() => Int)
  clicks: number;

  @OneToMany(() => LocalAdMedia, (media) => media.ad, { eager: true, cascade: true })
  @Field(() => [LocalAdMedia], { nullable: true })
  media: LocalAdMedia[];

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
