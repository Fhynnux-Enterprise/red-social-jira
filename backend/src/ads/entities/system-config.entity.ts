import { ObjectType, Field } from '@nestjs/graphql';
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('system_configs')
@ObjectType()
export class SystemConfig {
  @PrimaryColumn()
  @Field()
  key: string;

  @Column()
  @Field()
  value: string;
}
