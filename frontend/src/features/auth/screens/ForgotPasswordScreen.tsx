import React, { useMemo, useState } from 'react';
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
import { supabase } from '../../../api/supabase.client';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen({ navigation }: any) {
    const { colors } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);
    
    // Control de flujo: 1 = Pedir email, 2 = Validar código, 3 = Escribir nueva contraseña
    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Paso 1: Solicitar el correo de recuperación
    const handleRequestCode = async () => {
        setError(null);
        if (!email) {
            setError('Por favor, ingresa tu correo electrónico.');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor, ingresa un correo electrónico válido.');
            return;
        }

        setIsLoading(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());

            if (resetError) throw resetError;

            Toast.show({
                type: 'success',
                text1: 'Código enviado',
                text2: 'Hemos enviado el código de recuperación a tu correo.',
            });
            setStep(2);
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'No se pudo enviar el correo de recuperación.',
            });
            setError(err.message || 'No se pudo enviar el correo de recuperación.');
        } finally {
            setIsLoading(false);
        }
    };

    // Paso 2: Verificar únicamente el código OTP
    const handleVerifyCode = async () => {
        setError(null);
        
        if (!code || code.trim().length < 6 || code.trim().length > 8) {
            setError('Por favor, ingresa un código de verificación válido (entre 6 y 8 dígitos).');
            return;
        }

        setIsLoading(true);
        try {
            // Verificar el código OTP
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: code.trim(),
                type: 'recovery',
            });

            if (verifyError) throw verifyError;

            Toast.show({
                type: 'success',
                text1: 'Código verificado',
                text2: 'Código correcto. Ahora puedes ingresar tu nueva contraseña.',
            });
            
            // Avanzar al paso 3 (establecer nueva contraseña)
            setStep(3);
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Código incorrecto',
                text2: err.message || 'El código no es válido o ha expirado.',
            });
            setError(err.message || 'El código ingresado no es válido o ha expirado.');
        } finally {
            setIsLoading(false);
        }
    };

    // Paso 3: Actualizar la contraseña final
    const handleResetPassword = async () => {
        setError(null);
        
        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            // Actualizar la contraseña del usuario utilizando la sesión temporal activa
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            Toast.show({
                type: 'success',
                text1: 'Contraseña restablecida',
                text2: 'Tu contraseña ha sido restablecida. Inicia sesión con tus nuevas credenciales.',
            });

            // Cerrar la sesión temporal
            await supabase.auth.signOut();

            // Volver al inicio de sesión
            navigation.navigate('Login');
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'No se pudo restablecer la contraseña.',
            });
            setError(err.message || 'No se pudo restablecer la contraseña.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.content}>
                    {/* Botón Volver */}
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => {
                            if (step === 3) {
                                setStep(2);
                                setNewPassword('');
                                setConfirmPassword('');
                            } else if (step === 2) {
                                setStep(1);
                                setCode('');
                            } else {
                                navigation.goBack();
                            }
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <View style={styles.logoContainer}>
                        <Image
                            source={colors.logo}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>Recuperar Contraseña</Text>
                    
                    {error && <Text style={styles.formErrorText}>{error}</Text>}

                    {step === 1 && (
                        <>
                            <Text style={styles.subtitle}>
                                Introduce tu dirección de correo electrónico y te enviaremos un código de recuperación.
                            </Text>

                            <View style={styles.inputContainer}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Correo electrónico"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.buttonContainer}
                                onPress={handleRequestCode}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.buttonText}>Enviar Código</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkContainer}
                                onPress={() => navigation.navigate('Login')}
                                disabled={isLoading}
                            >
                                <Text style={styles.linkText}>Volver a Iniciar Sesión</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Text style={styles.subtitle}>
                                Hemos enviado un código a <Text style={styles.boldText}>{email}</Text>. Ingrésalo abajo para continuar.
                            </Text>

                            <View style={styles.inputContainer}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Código de verificación"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="number-pad"
                                        maxLength={8}
                                        value={code}
                                        onChangeText={setCode}
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.buttonContainer}
                                onPress={handleVerifyCode}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.buttonText}>Verificar Código</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkContainer}
                                onPress={() => setStep(1)}
                                disabled={isLoading}
                            >
                                <Text style={styles.linkText}>¿No recibiste el código? Reenviar</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Text style={styles.subtitle}>
                                Código correcto. Escribe y confirma tu nueva contraseña de acceso.
                            </Text>

                            <View style={styles.inputContainer}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nueva contraseña (mínimo 6 caracteres)"
                                        placeholderTextColor={colors.textSecondary}
                                        secureTextEntry
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        editable={!isLoading}
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Confirmar nueva contraseña"
                                        placeholderTextColor={colors.textSecondary}
                                        secureTextEntry
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.buttonContainer}
                                onPress={handleResetPassword}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.buttonText}>Establecer Contraseña</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}
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
    backButton: {
        position: 'absolute',
        top: 16,
        left: 20,
        padding: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 140,
        height: 140,
        borderRadius: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 22,
    },
    inputContainer: {
        marginBottom: 24,
    },
    inputWrapper: {
        marginBottom: 16,
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
    linkContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkText: {
        color: colors.primary,
        fontSize: 16,
    },
    formErrorText: {
        color: colors.error,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    boldText: {
        fontWeight: 'bold',
        color: colors.text,
    }
});
