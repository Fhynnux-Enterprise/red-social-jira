import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { SupabaseService } from './supabase.service';
import { UploadUrlResponse } from './dto/upload-url.response';

@Resolver()
export class StorageResolver {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Mutation(() => UploadUrlResponse, { name: 'generateUploadUrl' })
  @UseGuards(GqlAuthGuard)
  async generateUploadUrl(
    @Args('fileName') fileName: string,
    @Args('fileType') fileType: string,
    @Args('folder') folder: string,
  ): Promise<UploadUrlResponse> {
    return this.supabaseService.generateUploadUrl(fileName, fileType, folder);
  }
}
