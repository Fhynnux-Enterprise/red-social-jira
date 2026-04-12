import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@apollo/client/react';
import { GENERATE_UPLOAD_URL } from '../graphql/storage.operations';

export const useMediaUpload = () => {
  const [generateUploadUrl] = useMutation(GENERATE_UPLOAD_URL);

  const pickImage = async (
    allowsEditing: boolean = true,
    mediaTypes: 'Images' | 'Videos' | 'All' = 'Images',
    videoMaxDuration: number = 60,
    quality: number = 0.7
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
      videoMaxDuration,
      quality,
    });

    if (pickerResult.canceled) {
      return null;
    }

    const asset = pickerResult.assets[0];
    const localUri = asset.uri;
    const extension = localUri.split('.').pop();
    const mimeType = asset.mimeType || (mediaTypes === 'Images' ? 'image/jpeg' : 'video/mp4');

    return { localUri, mimeType, extension, duration: asset.duration };
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
        mediaTypes === 'Images' ? ['images' as const] :
        mediaTypes === 'Videos' ? ['videos' as const] :
        ['images', 'videos'] as const,
      quality: 0.8,
    });

    if (pickerResult.canceled) {
      return [];
    }

    return pickerResult.assets.map(asset => {
      const localUri = asset.uri;
      const extension = localUri.split('.').pop();
      const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
      return { localUri, mimeType, extension, duration: asset.duration };
    });
  };

  const uploadMedia = async (localUri: string, mimeType: string, folder: string) => {
    try {
      // 1. Derivar la extensión a partir del mimeType para garantizar consistencia.
      // Cuando el video se comprime pasa de .MOV a .mp4, pero el URI aún puede
      // llevar el nombre del compresor con otra extensión.
      const extensionFromMime: Record<string, string> = {
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'video/mpeg': 'mpeg',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const derivedExt = extensionFromMime[mimeType];
      const rawFileName = localUri.split('/').pop() || 'upload';
      const baseName = rawFileName.includes('.')
        ? rawFileName.substring(0, rawFileName.lastIndexOf('.'))
        : rawFileName;
      const fileName = derivedExt
        ? `${baseName}.${derivedExt}`
        : rawFileName;

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

      // 3. Subir directamente con XMLHttpRequest.
      // IMPORTANTE: fetch() en React Native añade Transfer-Encoding: chunked cuando
      // el body es un Blob, lo que hace que R2/S3 presigned URLs rechacen o guarden
      // el objeto con 0 bytes. XHR evita ese problema enviando el binario con el
      // Content-Length correcto.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('Content-Type', mimeType);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Error al subir a Cloudflare R2: HTTP ${xhr.status} - ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Error de red al subir el archivo'));
        xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado al subir el archivo'));

        // Abrir el archivo local como Blob y enviarlo
        fetch(localUri)
          .then(res => res.blob())
          .then(blob => xhr.send(blob))
          .catch(reject);
      });

      // 4. Retornar la URL pública para guardarla en la base de datos
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
