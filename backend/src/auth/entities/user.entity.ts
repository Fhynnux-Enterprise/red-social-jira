import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, OneToOne } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Post } from '../../posts/entities/post.entity';
import { UserCustomField } from '../../users/entities/user-custom-field.entity';
import { UserBadge } from '../../users/entities/user-badge.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Participant } from '../../chat/entities/participant.entity';
import { Message } from '../../chat/entities/message.entity';
import { Follow } from '../../follows/entities/follow.entity';
import { Story } from '../../stories/entities/story.entity';
import { JobOffer } from '../../jobs/entities/job-offer.entity';
import { ProfessionalProfile } from '../../jobs/entities/professional-profile.entity';
import { JobApplication } from '../../jobs/entities/job-application.entity';


@ObjectType()
@Entity('users')
export class User {
    @Field(() => ID)
    @PrimaryColumn('uuid')
    id: string;

    @Field()
    @Column({ unique: true })
    email: string;

    @Field()
    @Column({ unique: true })
    username: string;

    @Field()
    @Column({ name: 'first_name' })
    firstName: string;

    @Field()
    @Column({ name: 'last_name' })
    lastName: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    phone: string;

    @Field({ nullable: true })
    @Column({ type: 'text', nullable: true })
    bio: string;

    @Field({ nullable: true })
    @Column({ name: 'photo_url', nullable: true })
    photoUrl: string;

    @Field({ nullable: true })
    @Column({ name: 'cover_url', nullable: true })
    coverUrl: string;

    @Column({ default: 'USER' })
    role: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
    deletedAt: Date;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
    lastActiveAt?: Date;

    @Field(() => [Post], { nullable: true })
    @OneToMany(() => Post, (post) => post.author)
    posts: Post[];

    @Field(() => [UserCustomField], { nullable: true })
    @OneToMany(() => UserCustomField, (customField) => customField.author)
    customFields: UserCustomField[];

    @Field(() => UserBadge, { nullable: true })
    @OneToOne(() => UserBadge, badge => badge.user)
    badge: UserBadge;

    @Field(() => [Comment], { nullable: true })
    @OneToMany(() => Comment, (comment) => comment.user)
    comments: Comment[];

    @Field(() => [Participant], { nullable: true })
    @OneToMany(() => Participant, (participant) => participant.user)
    participations: Participant[];

    @Field(() => [Message], { nullable: true })
    @OneToMany(() => Message, (message) => message.sender)
    sentMessages: Message[];

    @Field(() => [Follow], { nullable: true })
    @OneToMany(() => Follow, follow => follow.following)
    followers: Follow[];

    @Field(() => [Follow], { nullable: true })
    @OneToMany(() => Follow, follow => follow.follower)
    following: Follow[];

    @Field(() => [Story], { nullable: true })
    @OneToMany(() => Story, (story) => story.user)
    stories: Story[];

    @Field(() => [JobOffer], { nullable: true })
    @OneToMany(() => JobOffer, (job) => job.author)
    jobOffers: JobOffer[];

    @Field(() => ProfessionalProfile, { nullable: true })
    @OneToOne(() => ProfessionalProfile, (profile) => profile.user)
    professionalProfile: ProfessionalProfile;

    @Field(() => [JobApplication], { nullable: true })
    @OneToMany(() => JobApplication, (application) => application.applicant)
    jobApplications: JobApplication[];
}
