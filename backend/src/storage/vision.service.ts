import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private client: ImageAnnotatorClient;

  constructor() {
    const jsonCreds = process.env.GOOGLE_CREDS_JSON;
    if (jsonCreds) {
      try {
        const credentials = JSON.parse(jsonCreds);
        this.client = new ImageAnnotatorClient({ credentials });
        this.logger.log('Google Cloud Vision inicializado usando la variable de entorno GOOGLE_CREDS_JSON.');
      } catch (err: any) {
        this.logger.error('Error al parsear la variable GOOGLE_CREDS_JSON, intentando por archivo:', err.message);
        this.initializeWithFile();
      }
    } else {
      this.initializeWithFile();
    }
  }

  private initializeWithFile() {
    // Utiliza por defecto el path en GOOGLE_APPLICATION_CREDENTIALS definido en el .env
    this.client = new ImageAnnotatorClient();
    this.logger.log('Google Cloud Vision inicializado usando archivo de credenciales de Google.');
  }

  /**
   * Analiza una imagen pública y determina si es segura.
   * Lanza BadRequestException si detecta contenido inapropiado.
   */
  async validateImageSafety(imageUrl: string): Promise<boolean> {
    try {
      this.logger.log(`Analizando seguridad de la imagen: ${imageUrl}`);
      const [result] = await this.client.safeSearchDetection(imageUrl);
      const detections = result.safeSearchAnnotation;

      if (!detections) {
        this.logger.warn(`No se recibieron anotaciones de Safe Search para: ${imageUrl}`);
        return true; // Si no hay detección, permitimos (fail-safe)
      }

      const { adult } = detections;

      // Google clasifica de 1 (UNKNOWN/VERY_UNLIKELY) a 5 (VERY_LIKELY)
      const isAdult = adult === 'LIKELY' || adult === 'VERY_LIKELY';

      if (isAdult) {
        this.logger.warn(
          `Imagen rechazada por contenido adulto. Nivel: ${adult}. URL: ${imageUrl}`
        );
        throw new BadRequestException(
          'La imagen subida no cumple con nuestras políticas de contenido (se detectó posible contenido explícito/adulto).'
        );
      }

      return true;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al conectar con Google Cloud Vision API: ${error.message}`);
      // Fail-safe: si falla la API de Google (por ejemplo, cuotas), permitimos para no bloquear la app
      return true;
    }
  }
}
