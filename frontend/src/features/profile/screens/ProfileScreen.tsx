import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/context/AuthContext';
import { ProfileService, UserProfile } from '../services/profile.service';
import { colors } from '../../../theme/colors';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
    const { signOut } = useAuth();
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await ProfileService.getProfile();
                setUserData(data);
            } catch (error: any) {
                console.error('Error fetching profile:', error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo cargar la información del perfil'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!userData) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <Text style={styles.errorText}>No se encontró el perfil</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Cabecera del Perfil con Menú ハンバーガー */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.menuButton}>
                    <Ionicons name="menu" size={32} color={colors.dark.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Sección de Avatar */}
                <View style={styles.avatarSection}>
                    {userData.photoUrl ? (
                        <Image source={{ uri: userData.photoUrl }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarPlaceholderText}>
                                {userData.firstName?.[0]}{userData.lastName?.[0]}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.fullName}>{userData.firstName} {userData.lastName}</Text>
                    <Text style={styles.username}>@{userData.username}</Text>
                </View>

                {/* Detalles del Usuario */}
                <View style={styles.detailsContainer}>
                    <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                            <Ionicons name="mail-outline" size={24} color={colors.primary} />
                            <Text style={styles.detailText}>{userData.email}</Text>
                        </View>
                    </View>
                </View>

            </View>

            {/* Modal del Menú de Opciones */}
            <Modal
                visible={isMenuVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHandle} />
                                <Text style={styles.modalTitle}>Configuración de la cuenta</Text>

                                <View style={styles.spacer} />

                                {/* Botón de Cerrar Sesión dentro del Modal */}
                                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                                    <Ionicons name="log-out-outline" size={24} color={colors.dark.error} />
                                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.dark.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.dark.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.dark.border,
    },
    menuButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    avatarImage: {
        width: 110,
        height: 110,
        borderRadius: 55,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    avatarPlaceholder: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255, 101, 36, 0.15)', // Tono naranja claro basado en el primary
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    avatarPlaceholderText: {
        color: colors.primary,
        fontSize: 40,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    fullName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.dark.text,
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: colors.dark.textSecondary,
    },
    detailsContainer: {
        width: '100%',
    },
    detailCard: {
        backgroundColor: colors.dark.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.dark.border,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        marginLeft: 16,
        fontSize: 16,
        color: colors.dark.text,
    },
    spacer: {
        flex: 1,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.dark.error,
        backgroundColor: 'rgba(255, 82, 82, 0.1)', // Fondo rojo sutil
        marginBottom: 20,
    },
    logoutText: {
        color: colors.dark.error,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    errorText: {
        color: colors.dark.textSecondary,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.dark.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 250,
        paddingBottom: 40,
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: colors.dark.border,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.dark.text,
        marginBottom: 20,
    }
});
