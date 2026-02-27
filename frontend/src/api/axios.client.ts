import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import Toast from 'react-native-toast-message';

// Apuntamos usando la IP de tu PC para que un celular físico conectado al mismo Wi-Fi pueda acceder
const BASE_URL = 'http://192.168.1.129:3000';

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

// Response Interceptor: Atrapar 401 Unauthorized globally
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
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
