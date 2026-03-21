import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

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

    @Field()
    @IsString()
    @IsNotEmpty()
    content: string;
}
