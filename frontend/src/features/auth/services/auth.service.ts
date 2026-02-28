import { apiClient } from '../../../api/axios.client';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../../api/supabase.client';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';

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
            const response = await apiClient.post('/auth/register', registerData);
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

            // Adjusting to handle newer versions for safety
            const idToken = (userInfo as any).data?.idToken || (userInfo as any).idToken;

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

            // 4. Guardar access_token en SecureStore y Axios
            await SecureStore.setItemAsync('access_token', access_token);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

            // 5. Sincronizar usuario con nuestro backend local (NestJS)
            await apiClient.post('/auth/sync');

            return { access_token };
        } catch (error: any) {
            if (error?.isCancelled || (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED)) {
                throw { isCancelled: true };
            }
            console.error('Error in Native loginWithGoogle: ', error);
            throw error;
        }
    }
};
