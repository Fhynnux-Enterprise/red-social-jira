import { useState, useEffect } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

/**
 * Hook useVideoCache (Versión para evitar Race Conditions)
 * Resuelve la fuente definitiva antes de permitir el renderizado del reproductor nativo.
 */
export const useVideoCache = (url: string) => {
    // Iniciamos en null para indicar que el sistema de archivos aún está resolviendo la fuente
    const [cachedSource, setCachedSource] = useState<string | null>(null);
    const [isCaching, setIsCaching] = useState<boolean>(false);

    useEffect(() => {
        if (!url || !url.startsWith('http')) {
            setCachedSource(url);
            return;
        }

        let isMounted = true;

        const handleCache = async () => {
            try {
                // 1. Generar nombre de archivo único
                const hash = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    url
                );
                const extension = url.split('.').pop()?.split('?')[0] || 'mp4';
                const fileName = `vcache_${hash.substring(0, 16)}.${extension}`;
                
                const file = new File(Paths.cache, fileName);

                if (file.exists) {
                    // Si existe localmente, esta es nuestra fuente definitiva
                    if (isMounted) setCachedSource(file.uri);
                } else {
                    // Si no existe, usamos la URL remota como fuente definitiva para esta sesión
                    if (isMounted) {
                        setCachedSource(url);
                        setIsCaching(true);
                    }

                    // Descarga silenciosa en segundo plano (sin actualizar estado al finalizar)
                    // Esto evita el stuttering y permite que en la siguiente carga ya esté en disco.
                    await File.downloadFileAsync(url, file).catch(() => {
                        /* Ignorar errores de descarga silenciosa */
                    });

                    if (isMounted) setIsCaching(false);
                }
            } catch (error) {
                console.warn('[useVideoCache] Error crítico:', error);
                if (isMounted) {
                    setCachedSource(url);
                    setIsCaching(false);
                }
            }
        };

        handleCache();

        return () => {
            isMounted = false;
        };
    }, [url]);

    return { cachedSource, isCaching };
};
