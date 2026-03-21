import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class PostMediaInput {
    @Field()
    url: string;

    @Field()
    type: string;

    @Field(() => Int)
    order: number;
}
