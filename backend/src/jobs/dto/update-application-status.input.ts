import { InputType, Field, ID } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ApplicationStatus } from '../entities/job-application.entity';

@InputType()
export class UpdateApplicationStatusInput {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  id_job_application: string;

  @Field(() => ApplicationStatus)
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
