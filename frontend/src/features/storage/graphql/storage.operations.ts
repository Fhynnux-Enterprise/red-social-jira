import { gql } from '@apollo/client';

export const GENERATE_UPLOAD_URL = gql`
  mutation GenerateUploadUrl($fileName: String!, $fileType: String!, $folder: String!) {
    generateUploadUrl(fileName: $fileName, fileType: $fileType, folder: $folder) {
      signedUrl
      publicUrl
    }
  }
`;
