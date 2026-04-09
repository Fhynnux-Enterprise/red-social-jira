import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID')!;
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID')!;
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY')!;

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL')!;

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('Cloudflare R2 Storage initialized');
  }

  /**
   * Sube un archivo al bucket de Cloudflare R2 y retorna su URL pública.
   *
   * @param file  Buffer con los bytes del archivo o un objeto Multer File
   * @param filename  Nombre original del archivo (se usará la extensión)
   * @param folder  Carpeta lógica dentro del bucket, ej: "posts", "stories", "avatars"
   * @returns URL pública: `${R2_PUBLIC_URL}/${folder}/${uuid}.ext`
   */
  async uploadFile(
    file: Express.Multer.File | Buffer,
    filename: string,
    folder: string,
  ): Promise<string> {
    const extension = filename.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${extension}`;
    const key = `${folder}/${uniqueFilename}`;

    const body = Buffer.isBuffer(file) ? file : file.buffer;
    const contentType = Buffer.isBuffer(file) ? 'application/octet-stream' : file.mimetype;

    this.logger.log(`Uploading file to R2: ${key}`);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    const publicFileUrl = `${this.publicUrl}/${key}`;
    this.logger.log(`File uploaded successfully: ${publicFileUrl}`);

    return publicFileUrl;
  }

  /**
   * Genera una Presigned URL de R2 para que el cliente suba directamente
   * el binario sin pasar por el servidor (zero egress, costo $0).
   *
   * @param filename     Nombre original del archivo (se usa la extensión)
   * @param folder       Carpeta lógica en el bucket, ej: "posts", "avatars"
   * @param contentType  MIME type del archivo, ej: "image/jpeg", "video/mp4"
   * @returns  { uploadUrl: string, publicUrl: string }
   *   - uploadUrl  → URL prefirmada para el PUT directo desde el cliente (expira en 5 min)
   *   - publicUrl  → URL pública definitiva que se guarda en la BD
   */
  async generatePresignedUploadUrl(
    filename: string,
    folder: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const extension = filename.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${extension}`;
    const key = `${folder}/${uniqueFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const publicUrl = `${this.publicUrl}/${key}`;

    this.logger.log(`Presigned URL generated for R2 key: ${key} (expires in 300s)`);
    this.logger.log(`[DEBUG] publicUrl that will be saved to DB: ${publicUrl}`);
    this.logger.log(`[DEBUG] R2_PUBLIC_URL env var value: "${this.publicUrl}"`);

    return { uploadUrl, publicUrl };
  }

  /**
   * Elimina un archivo del bucket de Cloudflare R2 dado su path relativo o URL pública.
   *
   * @param fileUrlOrPath  URL pública completa o path relativo (ej: "posts/abc.jpg")
   */
  async deleteFile(fileUrlOrPath: string): Promise<void> {
    // Normalizar: si viene como URL completa, extraer el key relativo
    let key = fileUrlOrPath;
    if (fileUrlOrPath.startsWith(this.publicUrl)) {
      key = fileUrlOrPath.replace(`${this.publicUrl}/`, '');
    }

    this.logger.log(`Deleting file from R2: ${key}`);

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error: any) {
      this.logger.error(`Error deleting file from R2: ${key} — ${error.message}`);
      throw error;
    }
  }
}
