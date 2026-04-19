import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

@ArgsType()
export class CreateChatArgs {
    @Field()
    @IsString()
    @IsNotEmpty()
    targetUserId: string;
}

@ArgsType()
export class SendMessageArgs {
    @Field()
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @Field({ nullable: true, defaultValue: '' })
    @IsString()
    @IsOptional()
    content: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    imageUrl?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    videoUrl?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    storyId?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    audioUrl?: string;

    @Field(() => Int, { nullable: true })
    @IsInt()
    @IsOptional()
    audioDuration?: number;
}
