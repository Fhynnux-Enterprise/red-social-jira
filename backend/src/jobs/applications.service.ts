import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication, ApplicationStatus } from './entities/job-application.entity';
import { JobOffer } from './entities/job-offer.entity';
import { StorageService } from '../storage/storage.service';
import { ApplyToJobInput } from './dto/apply-to-job.input';
import { ApplyToJobResponse } from './dto/apply-to-job.response';
import { UpdateApplicationStatusInput } from './dto/update-application-status.input';
import { UpdateApplicationInput } from './dto/update-application.input';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,

    @InjectRepository(JobOffer)
    private readonly jobOfferRepo: Repository<JobOffer>,

    private readonly storageService: StorageService,
  ) {}

  /**
   * Crea una nueva postulación y devuelve la Presigned URL de R2
   * para que el cliente suba el PDF del CV directamente al bucket.
   *
   * Flujo:
   *   1. Validar que la oferta existe.
   *   2. Evitar postulaciones duplicadas del mismo usuario.
   *   3. Generar presigned URL para el PDF (carpeta "cvs/").
   *   4. Guardar la aplicación con cvUrl = publicUrl (el cliente subirá el archivo después).
   *   5. Retornar { application, cvUploadUrl, cvPublicUrl }.
   */
  async applyToJob(
    input: ApplyToJobInput,
    applicantId: string,
  ): Promise<ApplyToJobResponse> {
    // 1. Verificar que la oferta existe
    const jobOffer = await this.jobOfferRepo.findOne({
      where: { id: input.jobOfferId },
    });
    if (!jobOffer) {
      throw new NotFoundException('La oferta de trabajo no existe.');
    }

    // 2. Evitar duplicados
    const existing = await this.applicationRepo.findOne({
      where: { jobOfferId: input.jobOfferId, applicantId },
    });
    if (existing) {
      throw new ConflictException('Ya te has postulado a esta oferta.');
    }

    // 3. Generar presigned URL para el CV (PDF)
    const { uploadUrl: cvUploadUrl, publicUrl: cvPublicUrl } =
      await this.storageService.generatePresignedUploadUrl(
        'cv.pdf',
        'cvs',
        'application/pdf',
      );

    // 4. Guardar la postulación (cvUrl = la URL pública que tendrá el PDF una vez subido)
    const application = this.applicationRepo.create({
      applicantId,
      jobOfferId: input.jobOfferId,
      message: input.message,
      contactPhone: input.contactPhone,
      cvUrl: cvPublicUrl,
      status: ApplicationStatus.PENDING,
    });
    const saved = await this.applicationRepo.save(application);

    // Recargar con relaciones para satisfacer el schema de GraphQL
    const full = await this.applicationRepo.findOne({
      where: { id: saved.id },
      relations: ['applicant', 'jobOffer', 'jobOffer.author'],
    });

    return {
      application: full!,
      cvUploadUrl,
      cvPublicUrl,
    };
  }

  /**
   * Devuelve todas las postulaciones recibidas para un JobOffer.
   * Solo el autor de la oferta puede consultar esto.
   */
  async getJobApplications(
    jobOfferId: string,
    requesterId: string,
  ): Promise<JobApplication[]> {
    const jobOffer = await this.jobOfferRepo.findOne({
      where: { id: jobOfferId },
    });
    if (!jobOffer) {
      throw new NotFoundException('La oferta de trabajo no existe.');
    }
    if (jobOffer.authorId !== requesterId) {
      throw new ForbiddenException(
        'Solo el creador de la oferta puede ver los candidatos.',
      );
    }

    return this.applicationRepo.find({
      where: { jobOfferId },
      relations: ['applicant'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Devuelve todas las postulaciones que el usuario autenticado ha enviado.
   * Esto alimenta la pestaña "Mis Resultados → Enviadas".
   */
  async getMyApplications(applicantId: string): Promise<JobApplication[]> {
    return this.applicationRepo.find({
      where: { applicantId },
      relations: ['jobOffer', 'jobOffer.author'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Acepta o rechaza una postulación.
   * Solo el autor de la oferta asociada puede hacer esto.
   */
  async updateApplicationStatus(
    input: UpdateApplicationStatusInput,
    requesterId: string,
  ): Promise<JobApplication> {
    const application = await this.applicationRepo.findOne({
      where: { id: input.applicationId },
      relations: ['jobOffer'],
    });
    if (!application) {
      throw new NotFoundException('Postulación no encontrada.');
    }
    if (application.jobOffer.authorId !== requesterId) {
      throw new ForbiddenException(
        'Solo el creador de la oferta puede actualizar el estado de una postulación.',
      );
    }

    application.status = input.status;
    await this.applicationRepo.save(application);

    return this.applicationRepo.findOne({
      where: { id: application.id },
      relations: ['applicant', 'jobOffer', 'jobOffer.author'],
    }) as Promise<JobApplication>;
  }

  /**
   * Elimina tu propia postulación (Solo PENDING).
   */
  async deleteApplication(applicationId: string, applicantId: string): Promise<boolean> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Postulación no encontrada.');
    if (application.applicantId !== applicantId) throw new ForbiddenException('No puedes eliminar postulación ajena.');
    if (application.status !== ApplicationStatus.PENDING) throw new ForbiddenException('Solo puedes eliminar postulaciones en estado PENDIENTE.');

    await this.applicationRepo.remove(application);
    return true;
  }

  /**
   * Actualiza tu propia postulación y puede devolver un nuevo enlace de CV.
   */
  async updateApplication(input: UpdateApplicationInput, applicantId: string): Promise<ApplyToJobResponse> {
    const application = await this.applicationRepo.findOne({
      where: { id: input.applicationId },
      relations: ['applicant', 'jobOffer', 'jobOffer.author'],
    });

    if (!application) throw new NotFoundException('Postulación no encontrada.');
    if (application.applicantId !== applicantId) throw new ForbiddenException('Solo puedes editar tu propia postulación.');
    if (application.status !== ApplicationStatus.PENDING) throw new ForbiddenException('Solo se pueden editar postulaciones PENDIENTES.');

    let cvUploadUrl = '';
    let cvPublicUrl = application.cvUrl;

    if (input.requestNewCv) {
      const res = await this.storageService.generatePresignedUploadUrl('cv.pdf', 'cvs', 'application/pdf');
      cvUploadUrl = res.uploadUrl;
      cvPublicUrl = res.publicUrl;
    }

    application.message = input.message !== undefined ? input.message : application.message;
    application.contactPhone = input.contactPhone !== undefined ? input.contactPhone : application.contactPhone;
    if (cvPublicUrl) {
      application.cvUrl = cvPublicUrl;
    }

    const saved = await this.applicationRepo.save(application);

    return {
      application: (await this.applicationRepo.findOne({
        where: { id: saved.id },
        relations: ['applicant', 'jobOffer', 'jobOffer.author'],
      }))!,
      cvUploadUrl,
      cvPublicUrl: cvPublicUrl || '',
    };
  }
}
