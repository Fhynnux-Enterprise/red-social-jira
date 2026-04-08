import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateJobOfferInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  location: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  salary?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  contactPhone: string;
}
