import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
    id_conversation: string;

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
}
