import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class ApplyToJobInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  id_job_offer: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  message?: string;
}
