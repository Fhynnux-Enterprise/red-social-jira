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
    ScrollView,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AuthService } from '../services/auth.service';
import { colors } from '../../../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

    const handleRegister = async () => {
        let valid = true;
        let newErrors: { [key: string]: string } = {};

        if (!firstName) { newErrors.firstName = 'El nombre es requerido'; valid = false; }
        if (!lastName) { newErrors.lastName = 'El apellido es requerido'; valid = false; }
        if (!username) { newErrors.username = 'El nombre de usuario es requerido'; valid = false; }

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
        } else if (password.length < 6) {
            newErrors.password = 'Mínimo 6 caracteres';
            valid = false;
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Confirma tu contraseña';
            valid = false;
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
            valid = false;
        }

        setErrors(newErrors);

        if (!valid) {
            return;
        }

        setIsLoading(true);
        try {
            await AuthService.register({ email, password, firstName, lastName, username });
            Toast.show({
                type: 'success',
                text1: '¡Registro Exitoso!',
                text2: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
            });
            navigation.navigate('Login'); // Devolver al usuario al login
        } catch (error: any) {
            // Manejar el formato de error que NestJS class-validator arroja
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Ocurrió un error al registrarte';

            Toast.show({
                type: 'error',
                text1: 'Error de Registro',
                text2: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
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
                        <View style={styles.inputWrapper}>
                            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                            <TextInput
                                style={[styles.input, errors.firstName ? styles.inputError : null]}
                                placeholder="Nombre"
                                placeholderTextColor={colors.dark.textSecondary}
                                value={firstName}
                                onChangeText={(text) => { setFirstName(text); setErrors({ ...errors, firstName: '' }); }}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                            <TextInput
                                style={[styles.input, errors.lastName ? styles.inputError : null]}
                                placeholder="Apellido"
                                placeholderTextColor={colors.dark.textSecondary}
                                value={lastName}
                                onChangeText={(text) => { setLastName(text); setErrors({ ...errors, lastName: '' }); }}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                            <TextInput
                                style={[styles.input, errors.username ? styles.inputError : null]}
                                placeholder="Nombre de usuario"
                                placeholderTextColor={colors.dark.textSecondary}
                                autoCapitalize="none"
                                value={username}
                                onChangeText={(text) => { setUsername(text); setErrors({ ...errors, username: '' }); }}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            <TextInput
                                style={[styles.input, errors.email ? styles.inputError : null]}
                                placeholder="Correo electrónico"
                                placeholderTextColor={colors.dark.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: '' }); }}
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
                                onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                            <TextInput
                                style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                                placeholder="Repetir Contraseña"
                                placeholderTextColor={colors.dark.textSecondary}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={(text) => { setConfirmPassword(text); setErrors({ ...errors, confirmPassword: '' }); }}
                                editable={!isLoading}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.buttonContainer}
                        onPress={handleRegister}
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
                                <Text style={styles.buttonText}>Registrarse</Text>
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
                                <Text style={styles.googleButtonText}>Registrarse con Google</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkContainer}
                        onPress={() => navigation.navigate('Login')}
                        disabled={isLoading}
                    >
                        <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión aquí</Text>
                    </TouchableOpacity>
                </ScrollView>
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
        backgroundColor: colors.dark.surface,
        marginTop: 1,
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
        alignItems: 'center',
    },
    linkText: {
        color: colors.primary,
        fontSize: 16,
    },
});
