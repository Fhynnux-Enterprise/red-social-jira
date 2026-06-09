import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
@Entity('system_settings')
export class SystemSetting {
  @Field()
  @PrimaryColumn({ length: 50, default: 'global' })
  id: string;

  @Field()
  @Column({ default: false, name: 'is_maintenance_mode' })
  isMaintenanceMode: boolean;

  @Field()
  @Column({ default: '1.0.0', name: 'min_required_app_version' })
  minRequiredAppVersion: string;

  @Field({ nullable: true })
  @Column({ nullable: true, name: 'maintenance_message' })
  maintenanceMessage?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, name: 'store_url_ios' })
  storeUrlIos?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, name: 'store_url_android' })
  storeUrlAndroid?: string;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
