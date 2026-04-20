import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class StoreProductMediaInput {
  @Field()
  @IsString()
  url: string;

  @Field()
  @IsString()
  type: string; // 'IMAGE' | 'VIDEO'

  @Field(() => Int)
  @IsNumber()
  order: number;
}

@InputType()
export class CreateStoreProductInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => Float)
  @IsNumber()
  price: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  condition?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => [StoreProductMediaInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreProductMediaInput)
  media?: StoreProductMediaInput[];
}
