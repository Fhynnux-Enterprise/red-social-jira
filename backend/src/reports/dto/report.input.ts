import { InputType, Field, ID } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { ReportedItemType } from '../enums/report.enums';

@InputType()
export class CreateReportInput {
    @Field(() => ID)
    @IsUUID()
    reportedItemId: string;

    @Field(() => ReportedItemType)
    @IsEnum(ReportedItemType)
    reportedItemType: ReportedItemType;

    @Field()
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000, { message: 'La razón no puede exceder los 1000 caracteres.' })
    reason: string;
}

@InputType()
export class ResolveReportInput {
    @Field(() => ID)
    @IsUUID()
    reportId: string;

    @Field(() => Boolean, { nullable: true, defaultValue: false })
    @IsOptional()
    @IsBoolean()
    deleteContent?: boolean;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    moderatorNote?: string;
}

@InputType()
export class DirectModerateInput {
    @Field(() => ID)
    @IsUUID()
    reportedItemId: string;

    @Field(() => ReportedItemType)
    @IsEnum(ReportedItemType)
    reportedItemType: ReportedItemType;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    moderatorNote?: string;
}
