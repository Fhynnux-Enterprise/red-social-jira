import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, ScrollView, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ProfileService, UserProfile } from '../services/profile.service';
import ThemeSelectorModal from '../../../components/ThemeSelectorModal';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USER_PROFILE } from '../graphql/profile.operations';
import { DELETE_POST, GET_POSTS } from '../../feed/graphql/posts.operations';
import { TOGGLE_FOLLOW, IS_FOLLOWING } from '../../follows/graphql/follows.operations';
import CreatePostModal from '../../feed/components/CreatePostModal';
import PostOptionsModal from '../../feed/components/PostOptionsModal';
import PostCard from '../../feed/components/PostCard';
import CommentsModal from '../../comments/components/CommentsModal';
import ProfileStats from '../components/ProfileStats';
import { GET_OR_CREATE_CHAT } from '../../chat/graphql/chat.operations';

export default function ProfileScreen() {
    const { signOut } = useAuth();
    const navigation = useNavigation();
    const { colors, themeMode, setThemeMode, isDark } = useTheme();
    const authContext = useAuth() as any;
    const currentUserId = authContext.user?.id;
    const [refreshing, setRefreshing] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

    // States para editar un post desde el perfil
    const [isCreatePostVisible, setIsCreatePostVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
    const [editingPostContent, setEditingPostContent] = useState<string>('');
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<{ post: any, minimize: boolean, initialTab?: 'comments' | 'likes' } | null>(null);
    const insets = useSafeAreaInsets();

    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const route = useRoute<any>();
    const profileUserId = route.params?.userId || currentUserId;
    const isMyProfile = profileUserId === currentUserId;

    const { data: gqlData, loading: gqlLoading, error: gqlError, refetch: refetchProfile } = useQuery(GET_USER_PROFILE, {
        variables: { id: profileUserId },
        skip: !profileUserId,
        fetchPolicy: 'cache-and-network',
    });

    const { data: followData } = useQuery(IS_FOLLOWING, {
        variables: { id_following: profileUserId },
        skip: !profileUserId || isMyProfile,
        fetchPolicy: 'cache-and-network',
    });

    const isFollowing = followData?.isFollowing || false;

    const [toggleFollow] = useMutation(TOGGLE_FOLLOW, {
        variables: { id_following: profileUserId },
        update(cache, { data: { toggleFollow: newValue } }) {
            // 1. Actualizar estado del botón (Query isFollowing)
            cache.writeQuery({
                query: IS_FOLLOWING,
                variables: { id_following: profileUserId },
                data: { isFollowing: newValue },
            });

            // 2. Actualizar lista de FOLLOWERS del perfil visitado
            const targetProfileId = cache.identify({ __typename: 'User', id: profileUserId });
            if (targetProfileId) {
                cache.modify({
                    id: targetProfileId,
                    fields: {
                        followers(existing = []) {
                            // Usamos (existing || []) para evitar el error "Cannot convert null to object"
                            const current = existing || [];
                            if (newValue) {
                                return [...current, { __typename: 'Follow', id_follow: `temp-f-${Date.now()}` }];
                            } else {
                                return current.length > 0 ? current.slice(0, -1) : [];
                            }
                        }
                    }
                });
            }

            // 3. Actualizar lista de FOLLOWING del usuario actual (Yo)
            const myProfileId = cache.identify({ __typename: 'User', id: currentUserId });
            if (myProfileId) {
                cache.modify({
                    id: myProfileId,
                    fields: {
                        following(existing = []) {
                            const current = existing || [];
                            if (newValue) {
                                return [...current, { __typename: 'Follow', id_follow: `temp-fng-${Date.now()}` }];
                            } else {
                                return current.length > 0 ? current.slice(0, -1) : [];
                            }
                        }
                    }
                });
            }
        },
    });

    const userData = gqlData?.getUserProfile || null;

    useFocusEffect(
        useCallback(() => {
            if (profileUserId) {
                // Pequeño retraso para evitar que la recarga de la pantalla (condición de carrera) le gane
                // al guardado en base de datos del 'Like' anterior que diste en el Feed.
                const timeout = setTimeout(() => {
                    refetchProfile().catch(e => console.log('Error refetching profile on focus', e));
                }, 500);
                return () => clearTimeout(timeout);
            }
        }, [profileUserId, refetchProfile])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetchProfile();
        } catch (error) {
            console.error('Error refreshing profile:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refetchProfile]);

    const [deletePost] = useMutation(DELETE_POST, {
        refetchQueries: [{ query: GET_POSTS }],
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Publicación borrada con éxito' });
            refetchProfile();
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        }
    });

    const [getOrCreateChat, { loading: creatingChat }] = useMutation(GET_OR_CREATE_CHAT);

    const handleMessagePress = async () => {
        if (!profileUserId) return;
        try {
            const { data } = await getOrCreateChat({
                variables: { targetUserId: profileUserId }
            });
            const id_conversation = data.getOrCreateOneOnOneChat.id_conversation;
            (navigation as any).navigate('ChatRoom', { id_conversation });
        } catch (error) {
            console.error("Error al crear el chat:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudo abrir el chat'
            });
        }
    };

    const handleOptionsPress = (post: any) => {
        setSelectedPost(post);
        setIsOptionsMenuVisible(true);
    };
    if (gqlLoading && !userData) {
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
            <ScrollView
                bounces={true}
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                }
            >

                {/* Banner Header */}
                <View style={styles.bannerContainer}>
                    <LinearGradient
                        colors={[colors.primary, '#FF9800']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bannerGradient}
                    />

                    {/* Floating Header Over Banner */}
                    <View style={[styles.floatingHeader, !isMyProfile && { justifyContent: 'flex-start' }]}>
                        {isMyProfile ? (
                            <>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('EditProfile' as never)}
                                    style={[styles.floatingMenuButton, { marginRight: 10 }]}
                                >
                                    <Ionicons name="pencil" size={20} color="#FFF" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.floatingMenuButton}>
                                    <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.floatingMenuButton}
                            >
                                <Ionicons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                        )}
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

                    {/* Botones de Acción (Si no es mi perfil) */}
                    {!isMyProfile && (
                        <View style={styles.profileActions}>
                            <TouchableOpacity
                                style={[
                                    styles.followBtn,
                                    isFollowing ? styles.followingBtn : styles.followBtnActive
                                ]}
                                onPress={() => toggleFollow()}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.followBtnText,
                                    isFollowing ? styles.followingBtnText : styles.followBtnActiveText
                                ]}>
                                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.messageBtn}
                                activeOpacity={0.7}
                                onPress={() => {
                                    // Aquí iría la lógica para abrir chat, por ahora solo UI
                                    Toast.show({ type: 'info', text1: 'Próximamente', text2: 'El chat directo estará disponible pronto.' });
                                }}
                            >
                                <Text style={styles.messageBtnText}>Mensaje</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Tarjetas Informativas Contenedor */}
                <View style={styles.cardsContainer}>
                    <ProfileStats 
                        followersCount={userData.followers?.length || 0}
                        followingCount={userData.following?.length || 0}
                        postsCount={userData.posts?.length || 0}
                    />

                    {/* Botón de Mensaje (Solo si no es mi perfil) */}
                    {!isMyProfile && (
                        <TouchableOpacity
                            onPress={handleMessagePress}
                            disabled={creatingChat}
                            style={[styles.messageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            {creatingChat ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <>
                                    <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.messageButtonText, { color: colors.text }]}>Mensaje</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

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
                            {userData.customFields.map((field: any, index: number) => (
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
                </View>

                {/* Seccion de Publicaciones */}
                <View style={styles.postsSection}>
                    <Text style={styles.postsSectionTitle}>Publicaciones</Text>
                    {userData.posts && userData.posts.length > 0 ? (
                        userData.posts.map((post: any, index: number) => (
                            <View key={post.id || index}>
                                <PostCard
                                    item={{ ...post, author: userData }}
                                    currentUserId={isMyProfile ? userData.id : undefined}
                                    onOptionsPress={handleOptionsPress}
                                    onOpenComments={(_, initialTab, minimize) => setSelectedPostForComments({ post: { ...post, author: userData }, minimize: !!minimize, initialTab })}
                                />
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
                            <View style={[styles.modalContent, { paddingTop: Math.max(insets.top, 20) + 10, paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
                                {/* Encabezado del Drawer */}
                                <View style={styles.drawerHeader}>
                                    <TouchableOpacity onPress={() => setIsMenuVisible(false)} style={styles.drawerCloseBtn}>
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

            {/* Modal para Editar Publicación */}
            <CreatePostModal
                visible={isCreatePostVisible}
                onClose={() => {
                    setIsCreatePostVisible(false);
                    refetchProfile();
                }}
                postId={editingPostId}
                initialContent={editingPostContent}
            />

            {/* Modal Menú de Opciones de la Publicación Inferior */}
            <PostOptionsModal
                visible={isOptionsMenuVisible}
                onClose={() => setIsOptionsMenuVisible(false)}
                onEdit={() => {
                    if (selectedPost) {
                        setEditingPostId(selectedPost.id);
                        setEditingPostContent(selectedPost.content);
                        setIsCreatePostVisible(true);
                    }
                }}
                onDelete={() => {
                    if (selectedPost) {
                        deletePost({ variables: { id: selectedPost.id } })
                    }
                }}
            />

            <CommentsModal 
                visible={!!selectedPostForComments} 
                post={
                    // Siempre usar el post VIVO del caché de Apollo (no el snapshot)
                    selectedPostForComments
                        ? (userData?.posts?.find((p: any) => p.id === selectedPostForComments.post?.id) 
                            ? { ...userData.posts.find((p: any) => p.id === selectedPostForComments.post?.id), author: userData }
                            : selectedPostForComments.post)
                        : null
                }
                onClose={() => setSelectedPostForComments(null)} 
                initialMinimized={selectedPostForComments?.minimize}
                initialTab={selectedPostForComments?.initialTab}
                onNextPost={() => {
                    const posts = userData?.posts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex !== -1 && currentIndex < posts.length - 1) {
                        setSelectedPostForComments({ post: { ...posts[currentIndex + 1], author: userData }, minimize: !!selectedPostForComments?.minimize, initialTab: selectedPostForComments?.initialTab });
                    }
                }}
                onPrevPost={() => {
                    const posts = userData?.posts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex > 0) {
                        setSelectedPostForComments({ post: { ...posts[currentIndex - 1], author: userData }, minimize: !!selectedPostForComments?.minimize, initialTab: selectedPostForComments?.initialTab });
                    }
                }}
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
        // Removed paddingHorizontal and paddingBottom from here
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
    profileActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 8,
        justifyContent: 'center',
        gap: 10,
    },
    followBtn: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    followBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    followingBtn: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
    },
    followBtnText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    followBtnActiveText: {
        color: '#FFF',
    },
    followingBtnText: {
        color: colors.text,
    },
    messageBtn: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageBtnText: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 14,
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
    // ---- TARJETAS Y CONTENEDORES GLOBALES ----
    cardsContainer: {
        marginBottom: 16,
    },
    infoCard: {
        backgroundColor: colors.surface,
        paddingHorizontal: 20,
        paddingVertical: 18,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        // Removed borderRadius, borderWidth, borderColor
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
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    messageButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
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
        paddingHorizontal: 16,
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
        marginHorizontal: 16,
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
        lineHeight: 20,
    },
    spacer: {
        flex: 1,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 82, 82, 0.05)',
        marginBottom: 20,
        marginTop: 10,
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
        backgroundColor: colors.background,
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
    drawerCloseBtn: {
        padding: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
