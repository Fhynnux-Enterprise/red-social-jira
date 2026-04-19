import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { GENERATE_UPLOAD_URL } from '../graphql/storage.operations';

export const useAudioUpload = () => {
    const [generateUploadUrl] = useMutation(GENERATE_UPLOAD_URL);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadAudio = async (localUri: string): Promise<string> => {
        setIsUploading(true);
        setError(null);
        
        try {
            // 1. Determinar el mimetype y la extensión
            // expo-av típicamente graba en formato m4a en móviles (iOS y Android moderno)
            const ext = localUri.split('.').pop()?.toLowerCase() || 'm4a';
            
            // Es CRÍTICO configurar correctamente el Content-Type para streaming móvil.
            // Application/octet-stream romperá la reproducción nativa de iOS Safari/React Native.
            let mimeType = 'audio/m4a';
            if (ext === 'mp3') mimeType = 'audio/mpeg';
            else if (ext === 'wav') mimeType = 'audio/wav';
            else if (ext === 'aac') mimeType = 'audio/aac';
            
            const fileName = `audio_${Date.now()}.${ext}`;
            const folder = 'chat-audios';

            // 2. Obtener URLs de Cloudflare R2
            const { data } = await generateUploadUrl({
                variables: {
                    fileName,
                    fileType: mimeType,
                    folder,
                },
            });

            if (!data?.generateUploadUrl) {
                throw new Error('Error al generar la URL de subida para audio');
            }

            const { signedUrl, publicUrl } = data.generateUploadUrl;

            // 3. Subir el archivo usando XMLHttpRequest para prevenir el bug de 0 bytes
            // en React Native cuando se usa fetch() con objetos pesados.
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signedUrl, true);
                // Establecer explícitamente el Content-Type para R2
                xhr.setRequestHeader('Content-Type', mimeType);

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Error al subir audio a R2: HTTP ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Error de red al subir el audio'));
                xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado'));

                // Pasar el objeto directamente al XHR
                const nativeFile = { uri: localUri, name: fileName, type: mimeType } as unknown as Blob;
                xhr.send(nativeFile);
            });

            return publicUrl;
        } catch (err: any) {
            const errorMessage = err.message || 'Error desconocido al subir audio';
            setError(errorMessage);
            console.error('Error in uploadAudio:', errorMessage);
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        uploadAudio,
        isUploading,
        error,
    };
};
