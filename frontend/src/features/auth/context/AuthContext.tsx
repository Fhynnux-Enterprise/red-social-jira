import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { registerSessionExpiredHandler, unregisterSessionExpiredHandler } from '../../../api/session.manager';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/auth.service';
import { ProfileService, UserProfile } from '../../profile/services/profile.service';
import Toast from 'react-native-toast-message';

type AuthContextData = {
    userToken: string | null;
    user: UserProfile | null;
    isLoading: boolean;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Ref para evitar múltiples disparos de logout cuando se recibe session_expired
    const isHandlingExpiry = useRef(false);

    // ── signOut ─────────────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        // 1. Limpiar estado inmediatamente → RootNavigator detecta y va al login
        setUserToken(null);
        setUser(null);
        isHandlingExpiry.current = false;  // reset para futuras sesiones

        // 2. Limpiar almacenamiento en segundo plano (sin bloquear la UI)
        try {
            await AuthService.logout();
        } catch (error) {
            console.error('Error durante logout en background:', error);
        }
    }, []);

    // Ref con la versión más reciente de signOut (resuelve stale-closure del event listener)
    const signOutRef = useRef(signOut);
    useEffect(() => { signOutRef.current = signOut; });

    // ── Carga inicial del token ──────────────────────────────────────────────
    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('access_token');
                if (token) {
                    setUserToken(token);
                    try {
                        const profile = await ProfileService.getProfile();
                        setUser(profile);
                    } catch (e) {
                        // El token existe pero ya no es válido
                        console.log('Token expirado o inválido detectado al inicio');
                        setUserToken(null);
                        setUser(null);
                        await SecureStore.deleteItemAsync('access_token');

                        // Mostrar mensaje al usuario (el Toast se muestra aún antes de que
                        // se desmonte AppNavigator porque isLoading sigue siendo true)
                        Toast.show({
                            type: 'info',
                            text1: 'Sesión expirada',
                            text2: 'Tu sesión ha caducado. Por favor inicia sesión de nuevo.',
                            visibilityTime: 4000,
                        });
                    }
                }
            } catch (error) {
                console.log('Error al recuperar el token de SecureStore', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkToken();

        // ── Handler de sesión expirada (registrado en el session manager) ──────
        registerSessionExpiredHandler(async () => {
            // Guard: evitar múltiples ejecuciones simultáneas
            if (isHandlingExpiry.current) return;
            isHandlingExpiry.current = true;

            // Limpiar estado inmediatamente (con la versión más reciente de signOut)
            await signOutRef.current();
        });

        return () => unregisterSessionExpiredHandler();
    }, []);

    // ── signIn ───────────────────────────────────────────────────────────────
    const signIn = async (token: string) => {
        isHandlingExpiry.current = false;  // reset al iniciar sesión
        await SecureStore.setItemAsync('access_token', token);
        setUserToken(token);
        try {
            const profile = await ProfileService.getProfile();
            setUser(profile);
        } catch (e) {
            console.error('Error fetching profile on login');
        }
    };

    // ── refreshProfile ───────────────────────────────────────────────────────
    const refreshProfile = async () => {
        try {
            const profile = await ProfileService.getProfile();
            setUser(profile);
        } catch (e: any) {
            console.error('Error refreshing profile:', e);
            if (e.response?.status === 401 || e.message?.includes('Unauthorized')) {
                if (!isHandlingExpiry.current) {
                    isHandlingExpiry.current = true;
                    Toast.show({
                        type: 'error',
                        text1: 'Sesión expirada',
                        text2: 'Tus credenciales han caducado. Por favor inicia sesión de nuevo.',
                        visibilityTime: 4000,
                    });
                    await signOut();
                }
            }
        }
    };

    return (
        <AuthContext.Provider value={{ userToken, user, isLoading, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
