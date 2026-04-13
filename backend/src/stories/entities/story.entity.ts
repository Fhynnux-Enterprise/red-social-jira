import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, BeforeInsert, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
@Entity('stories')
export class Story {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => User)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @Field()
  @Column({ name: 'media_url' })
  mediaUrl: string;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  content?: string;

  @Field()
  @Column({ name: 'media_type', type: 'varchar', length: 10 })
  mediaType: string; // 'image' | 'video'

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  // Lógica de expiración: 24 horas después de la creación
  @BeforeInsert()
  setExpiration() {
    if (!this.expiresAt) {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);
      this.expiresAt = expirationDate;
    }
  }
}
