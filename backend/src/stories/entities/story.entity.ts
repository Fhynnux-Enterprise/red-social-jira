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
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column()
  mediaUrl: string;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  content?: string;

  @Field()
  @Column({ type: 'varchar', length: 10 })
  mediaType: string; // 'image' | 'video'

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @Column({ type: 'timestamptz' })
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
