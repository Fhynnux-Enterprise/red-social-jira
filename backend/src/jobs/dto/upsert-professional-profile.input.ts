import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class UpsertProfessionalProfileInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  profession: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  experienceYears?: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  contactPhone: string;
}
