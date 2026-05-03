import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';

@ObjectType()
@Entity('cities')
export class City {
    @Field(() => ID)
    @PrimaryColumn({ type: 'varchar' })
    id: string;

    @Field()
    @Column()
    name: string;

    @Field()
    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
