import { ObjectType, Field } from '@nestjs/graphql';
import { JobApplication } from '../entities/job-application.entity';

/**
 * Respuesta al iniciar una postulación.
 * Contiene la aplicación recién creada (status PENDING) +
 * la Presigned URL de R2 para que el cliente suba el PDF del CV.
 */
@ObjectType()
export class ApplyToJobResponse {
  @Field(() => JobApplication)
  application: JobApplication;

  /** URL prefirmada de R2 (válida 5 min) para subir el PDF del CV */
  @Field()
  cvUploadUrl: string;

  /** URL pública final que se guardará en la BD al confirmar la subida */
  @Field()
  cvPublicUrl: string;
}
