import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
