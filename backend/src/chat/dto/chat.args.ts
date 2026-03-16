import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class CreateChatArgs {
    @Field()
    targetUserId: string;
}

@ArgsType()
export class SendMessageArgs {
    @Field()
    id_conversation: string;

    @Field()
    content: string;
}
