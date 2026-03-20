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
    ScrollView,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';

// --- Esquema de validación con Zod ---
const registerSchema = z
    .object({
        firstName: z.string().min(1, 'El nombre es requerido'),
        lastName: z.string().min(1, 'El apellido es requerido'),
        username: z
            .string()
            .min(1, 'El nombre de usuario es requerido')
            .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos (sin espacios)'),
        email: z
            .string()
            .min(1, 'El correo es requerido')
            .email('Dirección no válida'),
        password: z
            .string()
            .min(6, 'Mínimo 6 caracteres'),
        confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);

    const [isLoadingGoogle, setIsLoadingGoogle] = React.useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
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

    const onSubmit = async (data: RegisterFormData) => {
        try {
            const { confirmPassword, ...registerData } = data;
            await AuthService.register(registerData);
            Toast.show({
                type: 'success',
                text1: '¡Registro Exitoso!',
                text2: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
            });
            navigation.navigate('Login');
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Ocurrió un error al registrarte';

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
            });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Login')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={28} color={colors.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../../assets/images/icon-transparent.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>Crear Cuenta</Text>
                    <Text style={styles.subtitle}>Únete a Chunchi City App</Text>

                    <View style={styles.inputContainer}>
                        {/* Nombre */}
                        <Controller
                            control={control}
                            name="firstName"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                                    <TextInput
                                        style={[styles.input, errors.firstName ? styles.inputError : null]}
                                        placeholder="Nombre"
                                        placeholderTextColor={colors.textSecondary}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            )}
                        />

                        {/* Apellido */}
                        <Controller
                            control={control}
                            name="lastName"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
                                    <TextInput
                                        style={[styles.input, errors.lastName ? styles.inputError : null]}
                                        placeholder="Apellido"
                                        placeholderTextColor={colors.textSecondary}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            )}
                        />

                        {/* Nombre de usuario */}
                        <Controller
                            control={control}
                            name="username"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}
                                    <TextInput
                                        style={[styles.input, errors.username ? styles.inputError : null]}
                                        placeholder="Nombre de usuario"
                                        placeholderTextColor={colors.textSecondary}
                                        autoCapitalize="none"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        editable={!isSubmitting}
                                    />
                                </View>
                            )}
                        />

                        {/* Correo */}
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

                        {/* Contraseña */}
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

                        {/* Repetir Contraseña */}
                        <Controller
                            control={control}
                            name="confirmPassword"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.inputWrapper}>
                                    {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}
                                    <TextInput
                                        style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                                        placeholder="Repetir Contraseña"
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
                                <Text style={styles.buttonText}>Registrarse</Text>
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
                                <Text style={styles.googleButtonText}>Registrarse con Google</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkContainer}
                        onPress={() => navigation.navigate('Login')}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión aquí</Text>
                    </TouchableOpacity>
                </ScrollView>
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
    header: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 10 : 0,
        paddingBottom: 4,
        flexDirection: 'row',
    },
    backButton: {
        padding: 4,
        borderRadius: 20,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 4,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 18,
    },
    logo: {
        width: 120,
        height: 120,
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
        marginBottom: 20,
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
        marginTop: 1,
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
        alignItems: 'center',
    },
    linkText: {
        color: colors.primary,
        fontSize: 16,
    },
});
