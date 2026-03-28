import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL')!;
    const supabaseKey = (this.configService.get<string>('SUPABASE_KEY') || this.configService.get<string>('SUPABASE_ANON_KEY'))!;

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase initialized');
  }

  async generateUploadUrl(fileName: string, fileType: string, folder: string): Promise<{ signedUrl: string, publicUrl: string }> {
    const extension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${extension}`;
    const uniquePath = `${folder}/${uniqueFileName}`;

    this.logger.log(`Generating signed URL for: ${uniquePath}`);

    // Generar la URL prefirmada para subir el archivo
    const { data: uploadData, error: uploadError } = await this.supabase
      .storage
      .from('chunchi-media')
      .createSignedUploadUrl(uniquePath);

    if (uploadError) {
      this.logger.error(`Error generating signed upload URL: ${uploadError.message}`);
      throw new Error(`Supabase Storage Error: ${uploadError.message}`);
    }

    // Generar la URL pública final
    const { data: publicData } = this.supabase
      .storage
      .from('chunchi-media')
      .getPublicUrl(uniquePath);

    return {
      signedUrl: uploadData.signedUrl,
      publicUrl: publicData.publicUrl,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    this.logger.log(`Attempting to delete file: ${filePath}`);
    const { error } = await this.supabase
      .storage
      .from('chunchi-media')
      .remove([filePath]);

    if (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new Error(`Supabase Storage Error: ${error.message}`);
    } else {
      this.logger.log(`Successfully deleted file: ${filePath}`);
    }
  }
}
