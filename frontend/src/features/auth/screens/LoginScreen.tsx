import React, { useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Linking,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Constants from 'expo-constants';

// --- Esquema de validación con Zod ---
const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo es requerido')
        .email('Dirección no válida'),
    password: z
        .string()
        .min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);

    const passwordInputRef = useRef<any>(null);

    const [isLoadingGoogle, setIsLoadingGoogle] = React.useState(false);
    const [unconfirmedEmail, setUnconfirmedEmail] = React.useState<string | null>(null);
    const [isResending, setIsResending] = React.useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const openTerms = () => {
        Linking.openURL('https://fynnux.app/chunchi-city-app/terminos-condiciones').catch(() => {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el enlace de términos' });
        });
    };

    const openPrivacy = () => {
        Linking.openURL('https://fynnux.app/chunchi-city-app/politica-privacidad').catch(() => {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el enlace de privacidad' });
        });
    };

    useEffect(() => {
        // Usamos el ID desde el archivo .env para mayor seguridad y facilidad de mantenimiento
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (webClientId) {
            AuthService.initGoogleSignIn(webClientId);
        } else {
            console.error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no definido en el .env');
        }
    }, []);

    const handleGoogleLogin = async () => {
        setIsLoadingGoogle(true);
        try {
            const { access_token } = await AuthService.loginWithGoogle();
            await signIn(access_token);
        } catch (error: any) {
            if (error?.isCancelled) {
                Toast.show({
                    type: 'info',
                    text1: 'Autenticación cancelada',
                    text2: 'No seleccionaste ninguna cuenta de Google.',
                });
                return;
            }
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'No se pudo iniciar sesión con Google',
            });
        } finally {
            setIsLoadingGoogle(false);
        }
    };

    const onSubmit = async (data: LoginFormData) => {
        try {
            const response = await AuthService.login(data);
            await signIn(response.access_token);
        } catch (error: any) {
            // Si el error es por ban, el interceptor Axios ya habrá notificado
            // al AuthContext → no mostrar toast genérico de error
            const raw = error?.response?.data?.message ?? error?.message ?? '';
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.code === 'USER_BANNED') return;
                if (parsed?.code === 'EMAIL_NOT_CONFIRMED') {
                    setUnconfirmedEmail(data.email);
                    return;
                }
            } catch (_) {}

            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Ocurrió un error al iniciar sesión';

            const isInvalidCredentials = errorMessage.includes('Invalid login credentials');
            const isEmailNotConfirmed = 
                errorMessage.toLowerCase().includes('email not confirmed') ||
                errorMessage.toLowerCase().includes('email_not_confirmed') ||
                errorMessage.toLowerCase().includes('confirm your email') ||
                errorMessage.toLowerCase().includes('email confirmation');

            let finalMessage = errorMessage;
            if (isInvalidCredentials) {
                finalMessage = 'Correo o contraseña incorrectos.';
            } else if (isEmailNotConfirmed) {
                setUnconfirmedEmail(data.email);
                return;
            }

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: finalMessage,
            });
        }
    };

    const handleResendConfirmation = async () => {
        if (!unconfirmedEmail) return;
        setIsResending(true);
        try {
            await AuthService.resendConfirmation(unconfirmedEmail);
            Toast.show({
                type: 'success',
                text1: '¡Correo reenviado!',
                text2: 'Revisa tu bandeja de entrada o la carpeta de SPAM.',
            });
            setUnconfirmedEmail(null);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error al reenviar',
                text2: error?.response?.data?.message || error.message || 'Intenta de nuevo más tarde.',
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={colors.logo}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>{Constants.expoConfig?.name || 'App'}</Text>
                    <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

                    <View style={styles.inputContainer}>
                        {/* Campo Email */}
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                                    <TextInput
                                        style={[styles.input, errors.email ? styles.inputError : null]}
                                        placeholder="Correo electrónico"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        editable={!isSubmitting}
                                        returnKeyType="next"
                                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                                        blurOnSubmit={false}
                                    />
                                </View>
                            )}
                        />

                        {/* Campo Contraseña */}
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                                    <TextInput
                                        ref={passwordInputRef}
                                        style={[styles.input, errors.password ? styles.inputError : null]}
                                        placeholder="Contraseña"
                                        placeholderTextColor={colors.textSecondary}
                                        secureTextEntry
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        editable={!isSubmitting}
                                        returnKeyType="done"
                                        onSubmitEditing={handleSubmit(onSubmit)}
                                    />
                                </View>
                            )}
                        />

                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                            disabled={isSubmitting}
                            style={styles.forgotPasswordContainer}
                        >
                            <Text style={styles.forgotPasswordText}>¿Has olvidado tu contraseña?</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.buttonContainer}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isSubmitting || isLoadingGoogle}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradient}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Iniciar Sesión</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.buttonContainer, styles.googleButton]}
                        onPress={handleGoogleLogin}
                        disabled={isSubmitting || isLoadingGoogle}
                        activeOpacity={0.8}
                    >
                        {isLoadingGoogle ? (
                            <ActivityIndicator color={colors.text} />
                        ) : (
                            <View style={styles.googleContent}>
                                <Image
                                    source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }}
                                    style={{ width: 24, height: 24 }}
                                />
                                <Text style={styles.googleButtonText}>Continuar con Google</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.linkContainer}
                        onPress={() => navigation.navigate('Register')}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.linkText}>¿No tienes cuenta? Regístrate aquí</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Mensaje de aceptación legal al pie de la vista */}
            <View style={styles.footerDisclaimer}>
                <Text style={styles.disclaimerText}>
                    Al continuar aceptas los{' '}
                    <Text style={styles.disclaimerLink} onPress={openTerms}>
                        términos y condiciones
                    </Text>{' '}
                    y las{' '}
                    <Text style={styles.disclaimerLink} onPress={openPrivacy}>
                        políticas de privacidad
                    </Text>
                    .
                </Text>
            </View>

            {/* Modal de correo no confirmado */}
            <Modal
                visible={!!unconfirmedEmail}
                transparent
                animationType="fade"
                onRequestClose={() => setUnconfirmedEmail(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Correo no confirmado</Text>
                        </View>
                        
                        <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                            Antes de poder iniciar sesión, necesitas confirmar tu cuenta a través del enlace que te enviamos al correo.
                        </Text>
                       

                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={handleResendConfirmation}
                            disabled={isResending}
                        >
                            {isResending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalButtonText}>Reenviar correo de confirmación</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setUnconfirmedEmail(null)}
                        >
                            <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}


const getStyles = (colors: ThemeColors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 180,
        height: 180,
        borderRadius: 24,
    },
    termsText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    termsLink: {
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 16,
        padding: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 10,
    },
    modalButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalCloseBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: 15,
        fontWeight: '600',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 40,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 32,
    },
    inputWrapper: {
        marginBottom: 16,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginBottom: 4,
        marginLeft: 4,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputError: {
        borderColor: colors.error,
    },
    buttonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    googleButton: {
        backgroundColor: colors.surface,
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 16,
    },
    googleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    googleButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkText: {
        color: colors.primary,
        fontSize: 16,
    },
    forgotPasswordContainer: {
        alignSelf: 'center',
        marginTop: 4,
        marginBottom: 8,
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    footerDisclaimer: {
        paddingHorizontal: 55,
        paddingBottom: Platform.OS === 'ios' ? 10 : 20,
        alignItems: 'center',
    },
    disclaimerText: {
        textAlign: 'center',
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    disclaimerLink: {
        color: colors.primary,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
