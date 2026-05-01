import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LocalAd } from './local-ad.entity';

export enum LocalAdMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

@Entity('local_ad_media')
@ObjectType()
export class LocalAdMedia {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ name: 'ad_id' })
  adId: string;

  @ManyToOne(() => LocalAd, (ad) => ad.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ad_id' })
  ad: LocalAd;

  @Column()
  @Field()
  url: string;

  @Column({
    type: 'enum',
    enum: LocalAdMediaType,
    default: LocalAdMediaType.IMAGE,
  })
  @Field()
  type: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  thumbnailUrl?: string;
}
