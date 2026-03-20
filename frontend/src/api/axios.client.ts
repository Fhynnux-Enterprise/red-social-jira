import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
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

            // Sobrescribimos el mensaje técnico por uno amigable para que las pantallas lo usen
            error.message = friendlyMessage;
            error.isNetworkError = true;
        } 
        // ERROR 401: SESIÓN EXPIRADA
        else if (error.response?.status === 401) {
            DeviceEventEmitter.emit('session_expired');
            Toast.show({
                type: 'error',
                text1: 'Sesión expirada',
                text2: 'Por favor, inicia sesión nuevamente.',
            });
        }
        
        return Promise.reject(error);
    }
);
