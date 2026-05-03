import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsUUID,
  IsDate,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsUrl,
  ValidateNested,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class GrantAdvertiserInput {
  @Field()
  @IsUUID()
  userId: string;

  @Field()
  @IsDate()
  expiresAt: Date;

  @Field(() => Int, { nullable: true, defaultValue: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAds?: number;
}

@InputType()
export class UpdateAdvertiserPermissionInput {
  @Field()
  @IsUUID()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAds?: number;
}

@InputType()
export class LocalAdMediaInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  url: string;

  @Field()
  @IsIn(['IMAGE', 'VIDEO'])
  type: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

@InputType()
export class CreateLocalAdInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  actionLabel?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappPhone?: string;

  @Field(() => [LocalAdMediaInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalAdMediaInput)
  media?: LocalAdMediaInput[];
}

@InputType()
export class UpdateLocalAdInput {
  @Field()
  @IsUUID()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  actionLabel?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappPhone?: string;

  @Field(() => [LocalAdMediaInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalAdMediaInput)
  media?: LocalAdMediaInput[];
}


