import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { registerSessionExpiredHandler, unregisterSessionExpiredHandler } from '../../../api/session.manager';
import { registerBanHandler, unregisterBanHandler, resetSessionExpiredFlag } from '../../../api/apollo.client';
import { registerAxiosBanHandler, unregisterAxiosBanHandler } from '../../../api/axios.client';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/auth.service';
import { ProfileService, UserProfile } from '../../profile/services/profile.service';
import Toast from 'react-native-toast-message';
import { Alert, Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

type AuthContextData = {
    userToken: string | null;
    user: UserProfile | null;
    isLoading: boolean;
    banInfo: { bannedUntil: string; banReason: string } | null;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    setBanInfo: (info: { bannedUntil: string; banReason: string } | null) => void;
    triggerSessionExpired: (reason?: 'expired' | 'password_changed') => void;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [banInfo, setBanInfo] = useState<{ bannedUntil: string; banReason: string } | null>(null);
    const [reactivationToken, setReactivationToken] = useState<string | null>(null);
    const [isReactivating, setIsReactivating] = useState(false);
    const [expiryReason, setExpiryReason] = useState<'expired' | 'password_changed' | null>(null);

    // Ref para evitar múltiples disparos de logout cuando se recibe session_expired
    const isHandlingExpiry = useRef(false);

    const triggerSessionExpired = useCallback((reason: 'expired' | 'password_changed' = 'expired') => {
        setExpiryReason(reason);
    }, []);

    // ── signOut ─────────────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        // 1. Limpiar estado inmediatamente → RootNavigator detecta y va al login
        setUserToken(null);
        setUser(null);
        setBanInfo(null);
        // NOTA: isHandlingExpiry.current NO se resetea aquí para evitar race conditions.
        // Múltiples errores 401 simultáneos podrían volver a llamar signOut si se resetea
        // antes de que React re-renderice. Solo se resetea al iniciar sesión nueva (signIn).

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
                        triggerSessionExpired('expired');
                        setUserToken(null);
                        setUser(null);
                        await SecureStore.deleteItemAsync('access_token');
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
        registerSessionExpiredHandler(async (reason: 'expired' | 'password_changed' = 'expired') => {
            // Guard: evitar múltiples ejecuciones simultáneas
            if (isHandlingExpiry.current) return;
            isHandlingExpiry.current = true;

            // Activar modal
            triggerSessionExpired(reason);

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
        resetSessionExpiredFlag();         // resetear guard de Apollo errorLink
        setBanInfo(null);
        await SecureStore.setItemAsync('access_token', token);
        setUserToken(token);
        try {
            const profile = await ProfileService.getProfile();
            setUser(profile);
        } catch (e: any) {
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
                if (parsed?.code === 'ACCOUNT_DEACTIVATED') {
                    setReactivationToken(token);
                    return;
                }
            } catch (_) { /* no era JSON de ban/desactivado */ }
            console.error('Error fetching profile on login:', e?.response?.data || e?.message || e);
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
                    triggerSessionExpired('expired');
                    await signOut();
                }
            }
        }
    };

    const handleReactivate = async () => {
        if (!reactivationToken) return;
        setIsReactivating(true);
        try {
            await AuthService.reactivate(reactivationToken);
            const profile = await ProfileService.getProfile();
            setUser(profile);
            setReactivationToken(null);
            Toast.show({
                type: 'success',
                text1: 'Cuenta reactivada',
                text2: '¡Bienvenido de vuelta! Tu cuenta ha sido reactivada con éxito.',
            });
        } catch (err: any) {
            setReactivationToken(null);
            await signOut();
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudo reactivar la cuenta. Inténtalo más tarde.',
            });
        } finally {
            setIsReactivating(false);
        }
    };

    return (
        <AuthContext.Provider value={{ userToken, user, isLoading, banInfo, setBanInfo, signIn, signOut, refreshProfile, triggerSessionExpired }}>
            {children}
            <ReactivationModal 
                visible={!!reactivationToken}
                onCancel={async () => {
                    setReactivationToken(null);
                    await signOut();
                }}
                onReactivate={handleReactivate}
                isReactivating={isReactivating}
            />
            <SessionExpiredModal 
                visible={!!expiryReason}
                reason={expiryReason}
                onClose={() => setExpiryReason(null)}
            />
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

interface ReactivationModalProps {
    visible: boolean;
    onCancel: () => void;
    onReactivate: () => void;
    isReactivating: boolean;
}

const ReactivationModal: React.FC<ReactivationModalProps> = ({
    visible,
    onCancel,
    onReactivate,
    isReactivating
}) => {
    const { colors, isDark } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '1A' }]}>
                                <Ionicons name="refresh" size={30} color={colors.primary} />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Reactivar cuenta
                            </Text>
                            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                                Tu cuenta está desactivada y programada para eliminarse. ¿Deseas cancelarlo y reactivar tu cuenta con todo tu contenido?
                            </Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                    onPress={onCancel}
                                    disabled={isReactivating}
                                >
                                    <Text style={[styles.cancelText, { color: colors.text }]}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, { overflow: 'hidden' }]}
                                    onPress={onReactivate}
                                    disabled={isReactivating}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.secondary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    {isReactivating ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.reactivateText}>Reactivar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '85%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontWeight: '600',
        fontSize: 14,
    },
    reactivateText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

interface SessionExpiredModalProps {
    visible: boolean;
    reason: 'expired' | 'password_changed' | null;
    onClose: () => void;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
    visible,
    reason,
    onClose
}) => {
    const { colors, isDark } = useTheme();

    const title = reason === 'password_changed' ? 'Sesión Cerrada' : 'Sesión Expirada';
    const message = reason === 'password_changed' 
        ? 'Tu contraseña ha sido actualizada correctamente. Por favor inicia sesión con tu nueva contraseña.' 
        : 'Tu sesión ha caducado. Por favor inicia sesión de nuevo para continuar.';
    const iconName = reason === 'password_changed' ? 'key-outline' : 'time-outline';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '1A' }]}>
                                <Ionicons name={iconName} size={30} color={colors.primary} />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {title}
                            </Text>
                            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                                {message}
                            </Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { width: '100%', overflow: 'hidden' }]}
                                    onPress={onClose}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.secondary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    <Text style={styles.reactivateText}>Entendido</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
