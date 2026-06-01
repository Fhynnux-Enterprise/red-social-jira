import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@ObjectType()
@Entity('verification_types')
export class VerificationType {
    @Field(() => ID)
    @PrimaryColumn('varchar', { length: 50 })
    id: string; // ej: 'STANDARD', 'GOLD', 'VIP'

    @Field()
    @Column({ type: 'varchar', length: 100 })
    name: string; // ej: 'Verificado Oficial', 'Verificado de Oro'

    @Field({ nullable: true })
    @Column({ name: 'icon_url', type: 'varchar', length: 255, nullable: true })
    iconUrl?: string; // URL del icono correspondiente al verificado

    @Field({ nullable: true })
    @Column({ type: 'text', nullable: true })
    description?: string; // Descripción del rango / requisitos

    @Field()
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Field()
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
