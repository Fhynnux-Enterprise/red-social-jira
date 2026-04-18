import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum, IsUUID, IsOptional, MaxLength, IsBoolean } from 'class-validator';
import { AppealType } from '../enums/appeal.enums';

@InputType()
export class CreateAppealInput {
    @Field()
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    reason: string;

    @Field(() => AppealType)
    @IsEnum(AppealType)
    type: AppealType;

    @Field(() => ID, { nullable: true })
    @IsOptional()
    @IsUUID()
    referenceId?: string;
}

@InputType()
export class ResolveAppealInput {
    @Field(() => ID)
    @IsUUID()
    appealId: string;

    @Field(() => Boolean)
    @IsBoolean()
    approve: boolean;
}
