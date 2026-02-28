import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ProfileService, UserProfile } from '../services/profile.service';
import ThemeSelectorModal from '../../../components/ThemeSelectorModal';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
    const { signOut } = useAuth();
    const navigation = useNavigation();
    const { colors, themeMode, setThemeMode, isDark } = useTheme();
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
    const insets = useSafeAreaInsets();

    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                try {
                    const data = await ProfileService.getProfile();
                    setUserData(data);
                } catch (error: any) {
                    console.log('Error fetching profile:', error);
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
        }, [])
    );

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
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView bounces={false} style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* Banner Header */}
                <View style={styles.bannerContainer}>
                    <LinearGradient
                        colors={[colors.primary, '#FF9800']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bannerGradient}
                    />

                    {/* Floating Header Over Banner */}
                    <View style={styles.floatingHeader}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('EditProfile' as never)}
                            style={styles.floatingEditButton}
                        >
                            <Text style={styles.floatingEditButtonText}>Editar perfil</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.floatingMenuButton}>
                            <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Body Details */}
                <View style={styles.content}>
                    <View style={styles.avatarCenterContainer}>
                        <View style={styles.avatarWrapper}>
                            {userData.photoUrl ? (
                                <Image source={{ uri: userData.photoUrl }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarPlaceholderText}>
                                        {userData.firstName?.[0]}{userData.lastName?.[0]}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Text style={styles.fullName}>{userData.firstName} {userData.lastName}</Text>
                    <Text style={styles.username}>@{userData.username}</Text>

                    {/* Pro Badge */}
                    {userData.badge?.title && (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{userData.badge.title}</Text>
                        </View>
                    )}

                    {/* Stats Card */}
                    <View style={styles.statsCard}>

                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>0</Text>
                            <Text style={styles.statLabel}>Seguidores</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>0</Text>
                            <Text style={styles.statLabel}>Siguiendo</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{userData.posts?.length || 0}</Text>
                            <Text style={styles.statLabel}>Publicaciones</Text>
                        </View>
                    </View>

                    {/* Info Card (Phone and Bio) */}
                    {(userData.phone || userData.bio) && (
                        <View style={styles.infoCard}>
                            {userData.phone ? (
                                <View style={styles.infoBlock}>
                                    <View style={styles.infoRowTitle}>
                                        <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                                        <Text style={styles.infoTitle}>Número Telefónico</Text>
                                    </View>
                                    <Text style={styles.infoText}>{userData.phone}</Text>
                                </View>
                            ) : null}

                            {userData.phone && userData.bio ? <View style={styles.divider} /> : null}

                            {userData.bio ? (
                                <View style={styles.infoBlock}>
                                    <View style={styles.infoRowTitle}>
                                        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                                        <Text style={styles.infoTitle}>Biografía</Text>
                                    </View>
                                    <Text style={styles.infoTextBio}>{userData.bio}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}

                    {/* Custom Fields Card */}
                    {userData.customFields && userData.customFields.length > 0 && (
                        <View style={styles.infoCard}>
                            {userData.customFields.map((field, index) => (
                                <React.Fragment key={field.id}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.customFieldTitle}>{field.title}:</Text>
                                        <Text style={styles.customFieldValue}> {field.value}</Text>
                                    </View>
                                    {index < userData.customFields!.length - 1 && <View style={styles.divider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    )}

                    {/* Seccion de Publicaciones */}
                    <View style={styles.postsSection}>
                        <Text style={styles.postsSectionTitle}>Publicaciones</Text>
                        {userData.posts && userData.posts.length > 0 ? (
                            userData.posts.map((post, index) => (
                                <View key={post.id || index} style={styles.postCard}>
                                    {/* Author Info */}
                                    <View style={styles.postHeader}>
                                        <View style={styles.postAuthorImagePlaceholder}>
                                            {userData.photoUrl ? (
                                                <Image source={{ uri: userData.photoUrl }} style={styles.postAuthorImage} />
                                            ) : (
                                                <Text style={styles.postAuthorImageText}>
                                                    {(userData.firstName?.charAt(0) || '')}{(userData.lastName?.charAt(0) || '')}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.postAuthorInfo}>
                                            <Text style={styles.postAuthorName}>
                                                {userData.firstName} {userData.lastName}
                                            </Text>
                                            <Text style={styles.postTime}>
                                                {new Date(post.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Content */}
                                    <Text style={styles.postContent}>{post.content}</Text>

                                    {/* Interaction Row Dummy */}
                                    <View style={styles.postInteractions}>
                                        <TouchableOpacity style={styles.interactionBtn}>
                                            <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
                                            <Text style={styles.interactionText}>0</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.interactionBtn}>
                                            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                                            <Text style={styles.interactionText}>0</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.interactionBtn}>
                                            <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
                                            <Text style={styles.interactionText}>0</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyPostsContainer}>
                                <Ionicons name="images-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                                <Text style={styles.emptyPostsText}>Aún no hay publicaciones</Text>
                                <Text style={styles.emptyPostsSubText}>Cuando compartas fotos y videos, aparecerán aquí.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modal del Menú de Opciones a la Derecha */}
            <Modal
                visible={isMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalContent, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
                                {/* Encabezado del Drawer */}
                                <View style={styles.drawerHeader}>
                                    <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                                        <Ionicons name="close" size={28} color={colors.text} />
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Configuración</Text>
                                    <View style={{ width: 28 }} />
                                </View>

                                {/* Opciones de Configuración */}
                                <TouchableOpacity
                                    style={styles.settingButton}
                                    onPress={() => {
                                        setIsMenuVisible(false);
                                        setTimeout(() => setIsThemeModalVisible(true), 300);
                                    }}
                                >
                                    <View style={styles.settingLeft}>
                                        <Ionicons name="color-palette-outline" size={24} color={colors.text} />
                                        <Text style={styles.settingText}>Tema</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                <View style={styles.spacer} />

                                {/* Botón de Cerrar Sesión dentro del Modal/Drawer */}
                                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
                                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Modal para Ajustar el Tema */}
            <ThemeSelectorModal
                visible={isThemeModalVisible}
                onClose={() => setIsThemeModalVisible(false)}
                currentTheme={themeMode}
                onSelectTheme={(theme) => setThemeMode(theme)}
            />

        </SafeAreaView>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    bannerContainer: {
        width: '100%',
        height: 190,
        position: 'relative',
    },
    bannerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    floatingHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    floatingEditButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        marginRight: 10,
    },
    floatingEditButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    floatingMenuButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    avatarCenterContainer: {
        alignItems: 'center',
        marginTop: -45, // Hace que solape el banner
        marginBottom: 5,
    },
    avatarWrapper: {
        borderRadius: 50,
        padding: 4, // Borde blanco o fondo de app
        backgroundColor: colors.background,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 101, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        color: colors.primary,
        fontSize: 32,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    fullName: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 2,
        textAlign: 'center',
    },
    username: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 18,
        textAlign: 'center',
    },
    badgeContainer: {
        alignSelf: 'center',
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        marginBottom: 16,
        marginTop: -6,
    },
    badgeText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 10,
        justifyContent: 'space-around',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: '70%',
        backgroundColor: colors.border,
    },
    infoCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoBlock: {
        flexDirection: 'column',
    },
    infoRowTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    infoTitle: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textSecondary,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoText: {
        fontSize: 16,
        color: colors.text,
        marginLeft: 24, // alinea con el icono de arriba
    },
    infoTextBio: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 22,
        marginLeft: 24, // alinea con el icono de arriba
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 12,
    },
    customFieldTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.textSecondary,
        minWidth: 90,
    },
    customFieldValue: {
        fontSize: 15,
        color: colors.text,
        flex: 1,
    },
    postsSection: {
        marginTop: 10,
    },
    postsSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    emptyPostsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    emptyPostsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyPostsSubText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    postCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    postAuthorImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 101, 36, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    postAuthorImage: {
        width: '100%',
        height: '100%',
    },
    postAuthorImageText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    postAuthorInfo: {
        flex: 1,
    },
    postAuthorName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.text,
    },
    postTime: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    postContent: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.text,
        marginBottom: 16,
    },
    postInteractions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    interactionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    interactionText: {
        marginLeft: 6,
        fontSize: 14,
        color: colors.textSecondary,
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
        borderColor: colors.error,
        backgroundColor: isDark ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 82, 82, 0.05)',
        marginBottom: 20,
    },
    logoutText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    errorText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end', // Pega el contenido hacia el lado derecho
    },
    modalContent: {
        backgroundColor: colors.surface,
        width: '75%', // Tamaño de un menú lateral común (Drawer)
        height: '100%',
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold', // Un tamaño más modesto para el encabezado del drawer
        color: colors.text,
    },
    settingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingText: {
        fontSize: 16,
        color: colors.text,
        marginLeft: 16,
    }
});
