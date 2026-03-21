import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@apollo/client';
import { GENERATE_UPLOAD_URL } from '../graphql/storage.operations';

export const useMediaUpload = () => {
  const [generateUploadUrl] = useMutation(GENERATE_UPLOAD_URL);

  const pickImage = async (
    allowsEditing: boolean = true,
    mediaTypes: 'Images' | 'Videos' | 'All' = 'Images'
  ) => {
    // 1. Pedir permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permisos para acceder a la galería denegados');
    }

    // 2. Seleccionar archivo
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing,
      mediaTypes: 
        mediaTypes === 'Images' ? ImagePicker.MediaTypeOptions.Images :
        mediaTypes === 'Videos' ? ImagePicker.MediaTypeOptions.Videos : 
        ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (pickerResult.canceled) {
      return null;
    }

    const asset = pickerResult.assets[0];
    const localUri = asset.uri;
    const extension = localUri.split('.').pop();
    const mimeType = asset.mimeType || (mediaTypes === 'Images' ? 'image/jpeg' : 'video/mp4');

    return { localUri, mimeType, extension };
  };

  const pickMultipleMedia = async (
    mediaTypes: 'Images' | 'Videos' | 'All' = 'Images'
  ) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permisos para acceder a la galería denegados');
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: 
        mediaTypes === 'Images' ? ImagePicker.MediaTypeOptions.Images :
        mediaTypes === 'Videos' ? ImagePicker.MediaTypeOptions.Videos : 
        ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (pickerResult.canceled) {
      return [];
    }

    return pickerResult.assets.map(asset => {
      const localUri = asset.uri;
      const extension = localUri.split('.').pop();
      const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
      return { localUri, mimeType, extension };
    });
  };

  const uploadMedia = async (localUri: string, mimeType: string, folder: string) => {
    try {
      // 1. Preparar el nombre del archivo
      const fileName = localUri.split('/').pop() || 'upload.jpg';

      // 2. Obtener URLs del backend (Signed y Public)
      const { data } = await generateUploadUrl({
        variables: {
          fileName,
          fileType: mimeType,
          folder,
        },
      });

      if (!data?.generateUploadUrl) {
        throw new Error('Error al generar la URL de subida');
      }

      const { signedUrl, publicUrl } = data.generateUploadUrl;

      // 3. EL TRUCO DE REACT NATIVE: Convertir URI a Blob
      const response = await fetch(localUri);
      const blob = await response.blob();

      // 4. Subir el archivo mediante PUT a la URL firmada
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': mimeType,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Error al subir a Supabase: ${errorText}`);
      }

      // 5. Retornar la URL pública para guardarla en la base de datos
      return publicUrl;
    } catch (error) {
      console.error('Error in uploadMedia:', error);
      throw error;
    }
  };

  return {
    pickImage,
    pickMultipleMedia,
    uploadMedia,
  };
};
