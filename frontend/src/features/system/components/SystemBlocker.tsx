import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useSystemStatus } from '../../../contexts/SystemStatusContext';
import { useAuth } from '../../auth/context/AuthContext';

export default function SystemBlocker({ children }: { children: React.ReactNode }) {
    const { colors, isDark } = useTheme();
    const { status, message, storeUrlIos, storeUrlAndroid, checkStatus } = useSystemStatus();
    const { userToken, signOut } = useAuth();

    // Si todo está OK, o si el usuario no ha iniciado sesión (para dejarle ver la pantalla de login/registro),
    // no bloqueamos la interfaz
    if (status === 'OK' || !userToken) {
        return <>{children}</>;
    }

    const isUpdate = status === 'UPDATE_REQUIRED';
    const iconName = isUpdate ? 'cloud-download-outline' : 'construct-outline';
    const title = isUpdate ? 'Actualización Disponible' : 'En Mantenimiento';
    
    const handleUpdate = () => {
        const url = Platform.OS === 'ios' ? storeUrlIos : storeUrlAndroid;
        if (url) {
            Linking.openURL(url).catch(() => console.error("Couldn't open store url"));
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Ionicons name={iconName} size={80} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message || 'Estamos trabajando para mejorar tu experiencia.'}
            </Text>

            {isUpdate ? (
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
                    <Text style={styles.buttonText}>Actualizar Ahora</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ width: '100%', gap: 16 }}>
                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={checkStatus}>
                        <Text style={styles.buttonText}>Reintentar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.buttonOutline, { borderColor: colors.border }]} onPress={signOut}>
                        <Text style={[styles.buttonOutlineText, { color: colors.textSecondary }]}>Volver al login</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    button: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonOutline: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
    },
    buttonOutlineText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
