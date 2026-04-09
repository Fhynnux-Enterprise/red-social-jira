import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { StorageService } from './storage.service';
import { UploadUrlResponse } from './dto/upload-url.response';

@Resolver()
export class StorageResolver {
  constructor(
    // Supabase Storage abandonado — todo el almacenamiento de media va a R2.
    private readonly storageService: StorageService,
  ) {}

  /**
   * Genera una Presigned URL de Cloudflare R2 para que el cliente suba
   * el binario DIRECTAMENTE a R2 sin pasar por nuestro servidor.
   *
   * El cliente debe:
   *  1. Llamar esta mutación para obtener { signedUrl, publicUrl }.
   *  2. Hacer un HTTP PUT a `signedUrl` con el binario y el Content-Type correcto.
   *  3. Guardar `publicUrl` en la entidad correspondiente (post, story, avatar…).
   *
   * @param fileName   Nombre original del archivo (ej: "foto.jpg")
   * @param fileType   MIME type (ej: "image/jpeg", "video/mp4")
   * @param folder     Carpeta lógica en el bucket (ej: "posts", "stories", "avatars")
   */
  @Mutation(() => UploadUrlResponse, { name: 'generateUploadUrl' })
  @UseGuards(GqlAuthGuard)
  async generateUploadUrl(
    @Args('fileName') fileName: string,
    @Args('fileType') fileType: string,
    @Args('folder') folder: string,
  ): Promise<UploadUrlResponse> {
    const { uploadUrl, publicUrl } = await this.storageService.generatePresignedUploadUrl(
      fileName,
      folder,
      fileType,
    );

    // El campo `signedUrl` del DTO legacy mapea al `uploadUrl` de R2.
    return { signedUrl: uploadUrl, publicUrl };
  }
}
