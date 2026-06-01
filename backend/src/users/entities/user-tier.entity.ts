import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('user_tiers')
export class UserTier {
    @Field(() => ID)
    @PrimaryColumn('varchar', { length: 50 })
    id: string;

    @Field()
    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Field(() => Int)
    @Column({ name: 'max_carousel_items', type: 'int', default: 10 })
    maxCarouselItems: number;

    @Field(() => Int)
    @Column({ name: 'max_videos', type: 'int', default: 3 })
    maxVideos: number;

    @Field(() => Int)
    @Column({ name: 'max_video_duration', type: 'int', default: 60 })
    maxVideoDuration: number; // en segundos

    @Field()
    @Column({ name: 'max_video_quality', type: 'varchar', length: 50, default: '720p' })
    maxVideoQuality: string; // '720p', '1080p', '1080p_high'

    @Field(() => Int)
    @Column({ name: 'max_video_bitrate_kbps', type: 'int', default: 3000 })
    maxVideoBitrateKbps: number; // en kbps (ej: 3000 = 3 Mbps)

    @Field(() => Float)
    @Column({ name: 'max_upload_size_mb', type: 'float', default: 50.0 })
    maxUploadSizeMb: number;

    @OneToMany(() => User, user => user.tier)
    users?: User[];

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Field()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
