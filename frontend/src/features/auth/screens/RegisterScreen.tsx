import React, { useEffect, useMemo, useState, useRef } from 'react';
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
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Constants from 'expo-constants';

// --- Esquema de validación con Zod ---
const registerSchema = z
    .object({
        firstName: z.string().min(1, 'El nombre es requerido'),
        lastName: z.string().min(1, 'El apellido es requerido'),
        birthDate: z
            .string()
            .min(1, 'La fecha de nacimiento es requerida')
            .refine((val) => {
                const date = new Date(val);
                if (isNaN(date.getTime())) return false;
                const today = new Date();
                let age = today.getFullYear() - date.getFullYear();
                const m = today.getMonth() - date.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
                    age--;
                }
                return age >= 13;
            }, 'Debes tener al menos 13 años para registrarte'),
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

    const lastNameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);
    const [step, setStep] = useState(1);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

    const {
        control,
        handleSubmit,
        trigger,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        shouldUnregister: false,
        defaultValues: {
            firstName: '',
            lastName: '',
            birthDate: '',
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const birthDateValue = watch('birthDate');

    useEffect(() => {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (webClientId) {
            AuthService.initGoogleSignIn(webClientId);
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

    const handleNextStep = async () => {
        // Validar únicamente los campos del paso 1
        const isStep1Valid = await trigger(['firstName', 'lastName', 'birthDate']);
        if (isStep1Valid) {
            setStep(2);
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

    const onInvalid = (errors: any) => {
        console.log('[RegisterScreen] Form validation failed:', errors);
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
            const errorMsg = (errors as any)[firstErrorField]?.message || 'Por favor completa todos los campos correctamente.';
            Toast.show({
                type: 'error',
                text1: 'Error de validación',
                text2: `${errorMsg}`,
            });
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            setValue('birthDate', `${year}-${month}-${day}`, { shouldValidate: true });
        }
    };

    const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        if (step === 2) {
                            setStep(1);
                        } else {
                            navigation.navigate('Login');
                        }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Paso {step} de 2</Text>
            </View>

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../../assets/chunchi-city-images/icon-transparent.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>Crear Cuenta</Text>
                    <Text style={styles.subtitle}>Únete a {Constants.expoConfig?.name || 'App'}</Text>

                    {/* === PASO 1: DATOS PERSONALES === */}
                    <View style={[styles.stepContainer, { display: step === 1 ? 'flex' : 'none' }]}>
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
                                                returnKeyType="next"
                                                onSubmitEditing={() => lastNameRef.current?.focus()}
                                                blurOnSubmit={false}
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
                                                ref={lastNameRef}
                                                style={[styles.input, errors.lastName ? styles.inputError : null]}
                                                placeholder="Apellido"
                                                placeholderTextColor={colors.textSecondary}
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                editable={!isSubmitting}
                                                returnKeyType="next"
                                                onSubmitEditing={() => setShowDatePicker(true)}
                                            />
                                        </View>
                                    )}
                                />

                                {/* Fecha de nacimiento */}
                                <Controller
                                    control={control}
                                    name="birthDate"
                                    render={({ field: { value } }) => (
                                        <View style={styles.inputWrapper}>
                                            {errors.birthDate && <Text style={styles.errorText}>{errors.birthDate.message}</Text>}
                                            <TouchableOpacity
                                                onPress={() => setShowDatePicker(true)}
                                                activeOpacity={0.8}
                                                disabled={isSubmitting}
                                            >
                                                <View style={[styles.input, styles.dateInput, errors.birthDate ? styles.inputError : null]}>
                                                    <Text style={[styles.dateInputText, !value ? styles.placeholderText : null]}>
                                                        {value ? formatDateForDisplay(value) : 'Fecha de nacimiento'}
                                                    </Text>
                                                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                                                </View>
                                            </TouchableOpacity>

                                            {showDatePicker && (
                                                <DateTimePicker
                                                    value={birthDateValue ? new Date(birthDateValue + 'T00:00:00') : new Date()}
                                                    mode="date"
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                    maximumDate={new Date()}
                                                    onChange={onDateChange}
                                                />
                                            )}
                                        </View>
                                    )}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.buttonContainer}
                                onPress={handleNextStep}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradient}
                                >
                                    <Text style={styles.buttonText}>Siguiente</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <Text style={styles.dividerText}>o</Text>

                            <TouchableOpacity
                                style={[styles.buttonContainer, styles.googleButton]}
                                onPress={handleGoogleLogin}
                                disabled={isLoadingGoogle}
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
                        </View>

                    {/* === PASO 2: CREDENCIALES DE CUENTA === */}
                    <View style={[styles.stepContainer, { display: step === 2 ? 'flex' : 'none' }]}>
                            <View style={styles.inputContainer}>
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
                                                returnKeyType="next"
                                                onSubmitEditing={() => emailRef.current?.focus()}
                                                blurOnSubmit={false}
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
                                                ref={emailRef}
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
                                                onSubmitEditing={() => passwordRef.current?.focus()}
                                                blurOnSubmit={false}
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
                                                ref={passwordRef}
                                                style={[styles.input, errors.password ? styles.inputError : null]}
                                                placeholder="Contraseña"
                                                placeholderTextColor={colors.textSecondary}
                                                secureTextEntry
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                editable={!isSubmitting}
                                                returnKeyType="next"
                                                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                                                blurOnSubmit={false}
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
                                                ref={confirmPasswordRef}
                                                style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                                                placeholder="Repetir Contraseña"
                                                placeholderTextColor={colors.textSecondary}
                                                secureTextEntry
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                editable={!isSubmitting}
                                                returnKeyType="done"
                                                onSubmitEditing={handleSubmit(onSubmit, onInvalid)}
                                            />
                                        </View>
                                    )}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.buttonContainer}
                                onPress={handleSubmit(onSubmit, onInvalid)}
                                disabled={isSubmitting}
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
                                style={styles.backStepButton}
                                onPress={() => setStep(1)}
                                disabled={isSubmitting}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.backStepButtonText}>Volver al paso anterior</Text>
                            </TouchableOpacity>
                        </View>

                    <TouchableOpacity
                        style={styles.linkContainer}
                        onPress={() => navigation.navigate('Login')}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión aquí</Text>
                    </TouchableOpacity>
                </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    backButton: {
        padding: 4,
        borderRadius: 20,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    logo: {
        width: 90,
        height: 90,
        borderRadius: 18,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 28,
        textAlign: 'center',
    },
    stepContainer: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 24,
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
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateInputText: {
        fontSize: 16,
        color: colors.text,
    },
    placeholderText: {
        color: colors.textSecondary,
    },
    buttonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    gradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: 'bold',
    },
    dividerText: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 14,
        marginVertical: 12,
    },
    googleButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 14,
    },
    googleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    googleButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
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
    backStepButton: {
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 16,
    },
    backStepButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    linkContainer: {
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    linkText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '500',
    },
});
