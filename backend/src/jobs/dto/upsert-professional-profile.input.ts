import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsArray, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class ProfessionalProfileMediaInput {
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

  @Field(() => [ProfessionalProfileMediaInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfessionalProfileMediaInput)
  media?: ProfessionalProfileMediaInput[];
}
