import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { notifySessionExpired } from './session.manager';
import Toast from 'react-native-toast-message';

// Apuntamos usando la IP de tu PC para que un celular físico conectado al mismo Wi-Fi pueda acceder
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Inyectar token JWT automáticamente
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error al recuperar el token de SecureStore:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ─── Ban event emitter para Axios (reusa el mismo patrón que Apollo) ──────────
type BanHandler = (info: { bannedUntil: string; banReason: string }) => void;
let _axiosBanHandler: BanHandler | null = null;

export const registerAxiosBanHandler = (handler: BanHandler) => { _axiosBanHandler = handler; };
export const unregisterAxiosBanHandler = () => { _axiosBanHandler = null; };

// Response Interceptor: Atrapar 401 Unauthorized globally o errores de red
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // ERROR DE RED / SERVIDOR APAGADO
        if (!error.response) {
            const friendlyMessage = 'No se pudo establecer conexión con el servidor.';
            
            Toast.show({
                type: 'error',
                text1: 'Servidor no disponible',
                text2: friendlyMessage,
                visibilityTime: 5000,
            });

            error.message = friendlyMessage;
            error.isNetworkError = true;
        } 
        // ERROR 401: puede ser sesión expirada O cuenta baneada
        else if (error.response?.status === 401) {
            // Intentar parsear si es un ban estructurado
            const raw = error.response?.data?.message ?? '';
            try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (parsed?.code === 'USER_BANNED' && parsed?.bannedUntil) {
                    // Notificar el ban via handler registrado (AuthContext lo escucha)
                    _axiosBanHandler?.({
                        bannedUntil: parsed.bannedUntil,
                        banReason: parsed.banReason ?? 'Violación de las normas de la comunidad',
                    });
                    // Propagar el error sin toast de "sesión expirada"
                    return Promise.reject(error);
                }
            } catch (_) { /* no era JSON de ban */ }

            // 401 normal → sesión expirada
            notifySessionExpired();
            Toast.show({
                type: 'error',
                text1: 'Sesión expirada',
                text2: 'Por favor, inicia sesión nuevamente.',
            });
        }
        
        return Promise.reject(error);
    }
);
