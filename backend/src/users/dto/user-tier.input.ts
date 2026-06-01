import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsInt, IsNumber, IsOptional } from 'class-validator';

@InputType()
export class CreateUserTierInput {
    @Field()
    @IsNotEmpty()
    @IsString()
    id: string; // ej: 'STANDARD', 'VIP', 'CUSTOM_1'

    @Field()
    @IsNotEmpty()
    @IsString()
    name: string;

    @Field(() => Int, { defaultValue: 10 })
    @IsInt()
    maxCarouselItems: number;

    @Field(() => Int, { defaultValue: 3 })
    @IsInt()
    maxVideos: number;

    @Field(() => Int, { defaultValue: 60 })
    @IsInt()
    maxVideoDuration: number;

    @Field({ defaultValue: '720p' })
    @IsString()
    maxVideoQuality: string;

    @Field(() => Int, { defaultValue: 3000 })
    @IsInt()
    maxVideoBitrateKbps: number;

    @Field(() => Float, { defaultValue: 50.0 })
    @IsNumber()
    maxUploadSizeMb: number;
}

@InputType()
export class UpdateUserTierInput {
    @Field()
    @IsNotEmpty()
    @IsString()
    id: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    name?: string;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    maxCarouselItems?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    maxVideos?: number;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    maxVideoDuration?: number;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    maxVideoQuality?: string;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    @IsInt()
    maxVideoBitrateKbps?: number;

    @Field(() => Float, { nullable: true })
    @IsOptional()
    @IsNumber()
    maxUploadSizeMb?: number;
}
