import React, { useEffect, useMemo } from 'react';
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

    const [isLoadingGoogle, setIsLoadingGoogle] = React.useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    useEffect(() => {
        AuthService.initGoogleSignIn('382684798572-cbcfg6q5gu94pg140c9d2i2mjt9uu12n.apps.googleusercontent.com');
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
            } catch (_) {}

            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Ocurrió un error al iniciar sesión';

            const isInvalidCredentials = errorMessage.includes('Invalid login credentials');

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: isInvalidCredentials ? 'Correo o contraseña incorrectos.' : errorMessage,
            });
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
                            source={require('../../../../assets/images/icon-transparent.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>Chunchi City App</Text>
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
                                        style={[styles.input, errors.password ? styles.inputError : null]}
                                        placeholder="Contraseña"
                                        placeholderTextColor={colors.textSecondary}
                                        secureTextEntry
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            )}
                        />
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
});
