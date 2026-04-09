import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class JobOfferMediaInput {
  @Field()
  @IsString()
  url: string;

  @Field()
  @IsEnum(['IMAGE', 'VIDEO'])
  type: string;

  @Field(() => Int)
  @IsNumber()
  order: number;
}

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

  @Field(() => [JobOfferMediaInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobOfferMediaInput)
  media?: JobOfferMediaInput[];
}
