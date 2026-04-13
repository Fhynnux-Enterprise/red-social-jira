import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class UpdateApplicationInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  message?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  requestNewCv?: boolean;
}
