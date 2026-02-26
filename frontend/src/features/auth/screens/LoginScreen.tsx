import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AuthService } from '../services/auth.service';
import { colors } from '../../../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    useEffect(() => {
        AuthService.initGoogleSignIn('382684798572-cbcfg6q5gu94pg140c9d2i2mjt9uu12n.apps.googleusercontent.com');
    }, []);

    const handleGoogleLogin = async () => {
        setIsLoadingGoogle(true);
        try {
            const { access_token } = await AuthService.loginWithGoogle();
            await signIn(access_token);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error OAuth',
                text2: error.message || 'No se pudo iniciar sesión con Google',
            });
        } finally {
            setIsLoadingGoogle(false);
        }
    };

    const handleLogin = async () => {
        let valid = true;
        let newErrors: { email?: string; password?: string } = {};

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            newErrors.email = 'El correo es requerido';
            valid = false;
        } else if (!emailRegex.test(email)) {
            newErrors.email = 'Dirección no válida';
            valid = false;
        }

        if (!password) {
            newErrors.password = 'La contraseña es requerida';
            valid = false;
        }

        setErrors(newErrors);

        if (!valid) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await AuthService.login({ email, password });
            await signIn(response.access_token);
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Ocurrió un error al iniciar sesión';

            const isInvalidCredentials = errorMessage.includes('Invalid login credentials');

            Toast.show({
                type: 'error',
                text1: 'Error de Autenticación',
                text2: isInvalidCredentials ? 'Correo o contraseña incorrectos.' : errorMessage,
            });
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
                        <View style={styles.inputWrapper}>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            <TextInput
                                style={[styles.input, errors.email ? styles.inputError : null]}
                                placeholder="Correo electrónico"
                                placeholderTextColor={colors.dark.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: undefined }); }}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            <TextInput
                                style={[styles.input, errors.password ? styles.inputError : null]}
                                placeholder="Contraseña"
                                placeholderTextColor={colors.dark.textSecondary}
                                secureTextEntry
                                value={password}
                                onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: undefined }); }}
                                editable={!isLoading}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.buttonContainer}
                        onPress={handleLogin}
                        disabled={isLoading || isLoadingGoogle}
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
                                <Text style={styles.buttonText}>Iniciar Sesión</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.buttonContainer, styles.googleButton]}
                        onPress={handleGoogleLogin}
                        disabled={isLoading || isLoadingGoogle}
                        activeOpacity={0.8}
                    >
                        {isLoadingGoogle ? (
                            <ActivityIndicator color={colors.dark.text} />
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
                        disabled={isLoading}
                    >
                        <Text style={styles.linkText}>¿No tienes cuenta? Regístrate aquí</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.dark.background,
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
        color: colors.dark.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.dark.textSecondary,
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
        color: colors.dark.error,
        fontSize: 12,
        marginBottom: 4,
        marginLeft: 4,
    },
    input: {
        backgroundColor: colors.dark.surface,
        borderRadius: 12,
        padding: 16,
        color: colors.dark.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.dark.border,
    },
    inputError: {
        borderColor: colors.dark.error,
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
        backgroundColor: colors.dark.surface,
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.dark.border,
        paddingVertical: 16,
    },
    googleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    googleButtonText: {
        color: colors.dark.text,
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
