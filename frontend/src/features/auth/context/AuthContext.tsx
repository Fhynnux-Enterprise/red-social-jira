import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { registerSessionExpiredHandler, unregisterSessionExpiredHandler } from '../../../api/session.manager';
import { registerBanHandler, unregisterBanHandler } from '../../../api/apollo.client';
import { registerAxiosBanHandler, unregisterAxiosBanHandler } from '../../../api/axios.client';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/auth.service';
import { ProfileService, UserProfile } from '../../profile/services/profile.service';
import Toast from 'react-native-toast-message';

type AuthContextData = {
    userToken: string | null;
    user: UserProfile | null;
    isLoading: boolean;
    banInfo: { bannedUntil: string; banReason: string } | null;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    setBanInfo: (info: { bannedUntil: string; banReason: string } | null) => void;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [banInfo, setBanInfo] = useState<{ bannedUntil: string; banReason: string } | null>(null);

    // Ref para evitar múltiples disparos de logout cuando se recibe session_expired
    const isHandlingExpiry = useRef(false);

    // ── signOut ─────────────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        // 1. Limpiar estado inmediatamente → RootNavigator detecta y va al login
        setUserToken(null);
        setUser(null);
        setBanInfo(null);
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
                    } catch (e: any) {
                        // Si el 401 era un USER_BANNED, el interceptor Axios ya habrá
                        // llamado a setBanInfo. Solo tratamos los otros casos como sesión expirada.
                        const raw = e?.response?.data?.message ?? e?.message ?? '';
                        const isBan = (() => {
                            try {
                                const parsed = JSON.parse(raw);
                                return parsed?.code === 'USER_BANNED';
                            } catch (_) { return false; }
                        })();

                        if (isBan) {
                            // El interceptor ya llamó setBanInfo; solo aseguramos que el token se mantenga
                            return;
                        }

                        // Token inválido o sesión expirada
                        console.log('Token expirado o inválido detectado al inicio');
                        setUserToken(null);
                        setUser(null);
                        await SecureStore.deleteItemAsync('access_token');
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

        // ── Handler de ban activo (Apollo ─ GraphQL) ───────────────────────────
        registerBanHandler((info) => {
            setBanInfo(info);
        });

        // ── Handler de ban activo (Axios ─ REST /auth/me) ──────────────────────
        registerAxiosBanHandler((info) => {
            setBanInfo(info);
        });

        return () => {
            unregisterSessionExpiredHandler();
            unregisterBanHandler();
            unregisterAxiosBanHandler();
        };
    }, []);

    // ── signIn ───────────────────────────────────────────────────────────────
    const signIn = async (token: string) => {
        isHandlingExpiry.current = false;  // reset al iniciar sesión
        setBanInfo(null);
        await SecureStore.setItemAsync('access_token', token);
        setUserToken(token);
        try {
            const profile = await ProfileService.getProfile();
            setUser(profile);
        } catch (e: any) {
            // Chequear si el error es por ban
            const raw = e?.response?.data?.message ?? e?.message ?? '';
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.code === 'USER_BANNED' && parsed?.bannedUntil) {
                    setBanInfo({
                        bannedUntil: parsed.bannedUntil,
                        banReason: parsed.banReason ?? 'Violación de las normas de la comunidad',
                    });
                    return;
                }
            } catch (_) { /* no era JSON de ban */ }
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
        <AuthContext.Provider value={{ userToken, user, isLoading, banInfo, setBanInfo, signIn, signOut, refreshProfile }}>
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
