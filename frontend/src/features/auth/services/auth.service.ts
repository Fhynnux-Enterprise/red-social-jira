import { apiClient } from '../../../api/axios.client';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../../api/supabase.client';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

export const AuthService = {
    async login(loginData: { email: string; password: string }) {
        try {
            const response = await apiClient.post('/auth/login', loginData);

            const { access_token } = response.data;

            if (access_token) {
                // Guardamos el token de forma segura en el dispositivo
                await SecureStore.setItemAsync('access_token', access_token);
            }

            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async register(registerData: any) {
        try {
            const payload = {
                ...registerData,
                cityId: Constants.expoConfig?.extra?.cityId || 'chunchi',
            };
            const response = await apiClient.post('/auth/register', payload);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async logout() {
        try {
            await SecureStore.deleteItemAsync('access_token');
            await supabase.auth.signOut();
            // Asegurarse de inicializar antes de intentar cerrar sesión nativa de Google
            this.initGoogleSignIn('382684798572-cbcfg6q5gu94pg140c9d2i2mjt9uu12n.apps.googleusercontent.com');
            await GoogleSignin.signOut();
        } catch (error) {
            console.error('Error borrando el token al cerrar sesión', error);
        }
    },

    initGoogleSignIn(webClientId: string) {
        GoogleSignin.configure({
            webClientId,
            // offlineAccess: true, // Habilitar si necesitas un refresh token de Google
        });
    },

    async loginWithGoogle() {
        try {
            // 1. Verificar servicios de Google Play (Android)
            await GoogleSignin.hasPlayServices();

            // 2. Iniciar sesión nativa con Google
            const userInfo = await GoogleSignin.signIn() as any;

            if (userInfo?.type === 'cancelled' || userInfo?.type === 'cancel') {
                throw { isCancelled: true };
            }

            // Manejo seguro de idToken según versión de la librería
            const idToken = userInfo.data?.idToken || userInfo.idToken;

            if (!idToken) {
                throw new Error('No se recibió idToken de Google Sign-In');
            }

            // 3. Autenticar en Supabase usando el idToken recibido
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (error) throw error;
            if (!data.session?.access_token) {
                throw new Error('No se recibió la sesión desde Supabase');
            }

            const { access_token } = data.session;

            // 4. Guardar access_token y configurar Axios inmediatamente
            await SecureStore.setItemAsync('access_token', access_token);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

            // 5. Flujo de Sincronización Multi-tenant Silenciosa
            try {
                // Intentamos verificar si el perfil ya existe en el backend local para esta ciudad
                await apiClient.get('/auth/me');
            } catch (err: any) {
                const responseData = err.response?.data?.message;
                
                // Detectar si el backend indica que el perfil no está sincronizado
                const isNotSynced = (() => {
                    try {
                        const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
                        return parsed?.code === 'USER_NOT_SYNCED';
                    } catch (_) {
                        return false;
                    }
                })();

                if (isNotSynced) {
                    console.log('[AuthService] Usuario no sincronizado en esta ciudad. Iniciando sincronización silenciosa...');
                    
                    // Ejecutar la sincronización automática enviando el cityId actual
                    await apiClient.post('/auth/sync', {
                        cityId: Constants.expoConfig?.extra?.cityId || 'chunchi',
                    });
                    
                    console.log('[AuthService] Sincronización multi-tenant completada con éxito.');
                } else {
                    // Si es otro tipo de error (ej. Ban o error de red), propagarlo
                    throw err;
                }
            }

            return { access_token };
        } catch (error: any) {
            if (error?.isCancelled || (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED)) {
                throw { isCancelled: true };
            }
            console.error('Error in loginWithGoogle Flow: ', error);
            throw error;
        }
    }
};
