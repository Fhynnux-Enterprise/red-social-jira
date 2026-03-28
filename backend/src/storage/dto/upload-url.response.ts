import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UploadUrlResponse {
  @Field()
  signedUrl: string;

  @Field()
  publicUrl: string;
}
