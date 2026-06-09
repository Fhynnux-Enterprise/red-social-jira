import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Image, Platform, Alert, StatusBar, Modal, TouchableWithoutFeedback, Switch, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../api/supabase.client';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { DELETE_POST, GET_FEED, TOGGLE_SAVE_POST, GET_SAVED_POSTS } from '../graphql/posts.operations';
import { DELETE_STORE_PRODUCT } from '../../store/graphql/store.operations';
import { DELETE_JOB_OFFER, DELETE_PROFESSIONAL_PROFILE } from '../../jobs/graphql/jobs.operations';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import MaskedView from '@react-native-masked-view/masked-view';
import CreatePostModal from '../components/CreatePostModal';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { GET_ME, DELETE_ACCOUNT, UPDATE_NOTIFICATION_PREFERENCES } from '../../profile/graphql/profile.operations';
import Toast from 'react-native-toast-message';
import PostCard from '../components/PostCard';
import PostOptionsModal from '../components/PostOptionsModal';
import ReportModal from '../../reports/components/ReportModal';
import CommentsModal from '../../comments/components/CommentsModal';
import { StoriesBar } from '../../stories/components/StoriesBar';
import FeedItemDetailModal from '../components/FeedItemDetailModal';
import StoreProductCard from '../../store/components/StoreProductCard';
import ListFooter from '../../../components/ListFooter';
import NotificationBell from '../../notifications/components/NotificationBell';
import CreateProductModal from '../../store/components/CreateProductModal';
import CreateLocalAdModal from '../../advertisers/components/CreateLocalAdModal';
import NativeAdCard from '../../ads/components/NativeAdCard';
import { GET_AD_FREQUENCY, UPDATE_AD_FREQUENCY } from '../../ads/graphql/ads.operations';
import ThemeSelectorModal from '../../../components/ThemeSelectorModal';
import BlockedUsersModal from '../../user-blocks/components/BlockedUsersModal';


export interface PostAuthor {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photoUrl?: string | null;
    role?: string;
}

export interface PostMedia {
    id: string;
    url: string;
    type: string;
    order: number;
}

export interface PostLike {
    id: string;
    user: PostAuthor;
}

export interface Post {
    id: string;
    content: string;
    title?: string | null;
    media: PostMedia[];
    createdAt: string;
    updatedAt?: string;
    commentsCount: number;
    likes: PostLike[];
    author: PostAuthor;
}

interface GetPostsData {
    getPosts: Post[];
}

interface GetMeData {
    me: PostAuthor;
}

interface SelectedPostForComments {
    post: Post;
    minimize: boolean;
    initialTab?: 'comments' | 'likes';
    initialExpanded?: boolean;
}

const getFriendlyErrorMessage = (error: any): string => {
    if (!error) return '';
    const message = error.message || '';
    if (message.includes('ACCOUNT_DEACTIVATED') || (error.graphQLErrors && error.graphQLErrors.some((ge: any) => ge.message?.includes('ACCOUNT_DEACTIVATED') || ge.extensions?.code === 'ACCOUNT_DEACTIVATED'))) {
        return 'Tu cuenta ha sido desactivada y no se pueden mostrar las publicaciones.';
    }
    if (message.includes('USER_BANNED') || (error.graphQLErrors && error.graphQLErrors.some((ge: any) => ge.message?.includes('USER_BANNED') || ge.extensions?.code === 'USER_BANNED'))) {
        return 'Tu cuenta ha sido suspendida y no se pueden mostrar las publicaciones.';
    }
    return message;
};

export default function FeedScreen() {
    const { signOut, refreshProfile, triggerSessionExpired } = useAuth() as any;
    const authContext = useAuth() as any;
    const { colors, isDark, themeMode, setThemeMode } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const navigation = useNavigation();
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
    const [editingPostContent, setEditingPostContent] = useState<string>('');
    const [editingPostTitle, setEditingPostTitle] = useState<string>('');
    const [editingPostMedia, setEditingPostMedia] = useState<any[]>([]);
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<SelectedPostForComments | null>(null);
    const [selectedFeedItem, setSelectedFeedItem] = useState<any | null>(null);
    const [isStoreModalVisible, setIsStoreModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [isLocalAdModalVisible, setIsLocalAdModalVisible] = useState(false);
    const [editingLocalAd, setEditingLocalAd] = useState<any | null>(null);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const resumeCommentsRef = useRef<any>(null);
    const apolloClient = useApolloClient();

    const isFocused = useIsFocused();
    // Estado para trackear qué post está visible en pantalla (para autoplay)
    const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [scrollOffset, setScrollOffset] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [adFrequency, setAdFrequency] = useState(5);

    // Estados para el menú de configuración
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
    const [isBlockedUsersVisible, setIsBlockedUsersVisible] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'account' | 'notifications' | 'changePassword'>('main');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [logoutAllDevices, setLogoutAllDevices] = useState(true);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string; type: 'error' | 'success'; onPress?: () => void } | null>(null);
    const [receiveSystem, setReceiveSystem] = useState(true);
    const [receiveModeration, setReceiveModeration] = useState(true);
    const [receiveSocial, setReceiveSocial] = useState(true);
    const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);
    const insets = useSafeAreaInsets();

    const handleCloseMenu = useCallback(() => {
        setIsMenuVisible(false);
        setMenuView('main');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setLogoutAllDevices(true);
    }, []);

    // Memoria para guardar los anuncios cargados y evitar que cambien al hacer scroll o swipe
    const [loadedAds, setLoadedAds] = useState<Record<string, any>>({});

    const { data, loading, error, refetch, fetchMore, networkStatus } = useQuery<{ getFeed: any[] }>(GET_FEED, {
        variables: { limit: 10, offset: 0 },
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
    });

    const { data: meData } = useQuery<GetMeData>(GET_ME, {
        fetchPolicy: 'cache-and-network',
    });
    const currentUser = meData?.me;
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

    // Obtener frecuencia de anuncios desde el servidor
    const { data: configData, refetch: refetchAdFrequency } = useQuery(GET_AD_FREQUENCY, {
        fetchPolicy: 'network-only',
    });

    // Sincronizar el estado local con la respuesta del servidor
    useEffect(() => {
        if (configData?.getAdFrequency != null) {
            setAdFrequency(configData.getAdFrequency);
        }
    }, [configData?.getAdFrequency]);

    useFocusEffect(
        useCallback(() => {
            refetchAdFrequency();
        }, [refetchAdFrequency])
    );

    const [updateNotificationPreferences] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);

    useEffect(() => {
        if (isMenuVisible && authContext.user) {
            setReceiveSystem(authContext.user.receiveSystemNotifications ?? true);
            setReceiveModeration(authContext.user.receiveModerationNotifications ?? true);
            setReceiveSocial(authContext.user.receiveSocialNotifications ?? true);
        }
    }, [isMenuVisible, authContext.user]);

    const handleTogglePreference = async (key: 'system' | 'moderation' | 'social', value: boolean) => {
        let nextSystem = receiveSystem;
        let nextModeration = receiveModeration;
        let nextSocial = receiveSocial;

        if (key === 'system') {
            setReceiveSystem(value);
            nextSystem = value;
        } else if (key === 'moderation') {
            setReceiveModeration(value);
            nextModeration = value;
        } else if (key === 'social') {
            setReceiveSocial(value);
            nextSocial = value;
        }

        try {
            await updateNotificationPreferences({
                variables: {
                    receiveSystemNotifications: nextSystem,
                    receiveModerationNotifications: nextModeration,
                    receiveSocialNotifications: nextSocial,
                }
            });
            await refreshProfile();
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            if (key === 'system') setReceiveSystem(!value);
            if (key === 'moderation') setReceiveModeration(!value);
            if (key === 'social') setReceiveSocial(!value);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudieron actualizar tus preferencias.'
            });
        }
    };

    // Ya no usamos useFocusEffect para refetch manual en cada foco para evitar saltos y recargas molestas.
    // Apollo Client con cache-and-network ya se encarga de servir datos de caché inmediatamente.

    /**
     * Inyecta un objeto de publicidad cada N elementos del feed y fusiona datos cacheados si existen.
     */
    const injectAds = useCallback((items: any[], freq: number, cachedAds: Record<string, any>) => {
        const result: any[] = [];
        items.forEach((item, index) => {
            result.push(item);
            // Inyectar publicidad cada N elementos (freq)
            if ((index + 1) % freq === 0) {
                const adId = `ad-after-${item.id}`;
                const cachedAd = cachedAds[adId] || {};

                // Si el anuncio fue borrado u ocultado localmente, no lo inyectamos
                if (cachedAd.isDeleted) return;

                result.push({
                    ...cachedAd,
                    realId: cachedAd.id || cachedAd.realId, // Preservar el UUID real
                    id: adId,                               // Mantener el ID posicional para el FlatList
                    isAd: true,
                    __typename: 'Ad',
                });
            }
        });
        return result;
    }, []);

    const augmentedFeed = useMemo(() => {
        if (!data?.getFeed) return [];
        const freq = configData?.getAdFrequency ?? adFrequency;
        return injectAds(data.getFeed, freq, loadedAds);
    }, [data?.getFeed, injectAds, adFrequency, configData?.getAdFrequency, loadedAds]);

    const [deletePost] = useMutation(DELETE_POST, {
        refetchQueries: [{ query: GET_FEED, variables: { limit: 10, offset: 0 } }],
    });

    const [deleteStoreProduct] = useMutation(DELETE_STORE_PRODUCT);
    const [deleteJobOffer] = useMutation(DELETE_JOB_OFFER);
    const [deleteProfessionalProfile] = useMutation(DELETE_PROFESSIONAL_PROFILE);

    const [toggleSavePost] = useMutation(TOGGLE_SAVE_POST);

    const [deleteAccount] = useMutation(DELETE_ACCOUNT, {
        onCompleted: async () => {
            Toast.show({
                type: 'success',
                text1: 'Cuenta desactivada',
                text2: 'Tu cuenta ha sido desactivada. Tienes 30 días para volver a iniciar sesión y recuperarla.',
            });
            await signOut();
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'No se pudo eliminar la cuenta');
        }
    });

    const handleDeleteAccount = useCallback(() => {
        setIsConfirmDeleteVisible(true);
    }, []);

    const handleChangePassword = useCallback(async () => {
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            setCustomAlert({ visible: true, title: 'Campos requeridos', message: 'Por favor, completa todos los campos.', type: 'error' });
            return;
        }

        if (newPassword.length < 6) {
            setCustomAlert({ visible: true, title: 'Contraseña muy corta', message: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setCustomAlert({ visible: true, title: 'Contraseñas no coinciden', message: 'La nueva contraseña y su confirmación no coinciden.', type: 'error' });
            return;
        }

        const userEmail = authContext.user?.email;
        if (!userEmail) {
            setCustomAlert({ visible: true, title: 'Error de usuario', message: 'No se pudo obtener el correo del usuario.', type: 'error' });
            return;
        }

        setIsChangingPassword(true);

        try {
            // 1. Re-autenticar al usuario para verificar la contraseña actual
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: oldPassword,
            });

            if (signInError) {
                setCustomAlert({ visible: true, title: 'Contraseña actual incorrecta', message: 'La contraseña actual ingresada es inválida.', type: 'error' });
                setIsChangingPassword(false);
                return;
            }

            // 2. Cambiar la contraseña del usuario
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                setCustomAlert({ visible: true, title: 'Error al actualizar', message: updateError.message || 'No se pudo actualizar la contraseña.', type: 'error' });
                setIsChangingPassword(false);
                return;
            }

            // 3. Cerrar sesión según la selección con Alert de éxito
            setCustomAlert({
                visible: true,
                title: 'Contraseña actualizada',
                message: 'Tu contraseña ha sido cambiada correctamente.',
                type: 'success',
                onPress: async () => {
                    setIsChangingPassword(false);
                    handleCloseMenu();
                    
                    triggerSessionExpired('password_changed');

                    if (logoutAllDevices) {
                        await supabase.auth.signOut({ scope: 'global' });
                    } else {
                        await supabase.auth.signOut({ scope: 'local' });
                    }
                    
                    await signOut();
                }
            });

        } catch (error: any) {
            setCustomAlert({ visible: true, title: 'Error', message: error.message || 'Ocurrió un error inesperado.', type: 'error' });
            setIsChangingPassword(false);
        }
    }, [oldPassword, newPassword, confirmNewPassword, logoutAllDevices, authContext.user, handleCloseMenu, signOut, triggerSessionExpired]);

    const handleToggleSave = useCallback(async (item: any) => {
        if (!item) return;

        const itemId = item.realId || item.id;
        const itemType = item.__typename === 'JobOffer' ? 'JOB_OFFER' :
            item.__typename === 'ProfessionalProfile' ? 'PROFESSIONAL_PROFILE' :
                item.__typename === 'StoreProduct' ? 'STORE_PRODUCT' :
                    item.isAd || item.__typename === 'Ad' ? 'AD' : 'POST';

        const wasSaved = !!item.isSaved;

        try {
            await toggleSavePost({
                variables: { postId: itemId, itemType },
                // ── Optimistic UI: el ícono cambia INMEDIATAMENTE sin esperar al servidor ──
                optimisticResponse: {
                    toggleSavePost: !wasSaved,
                },
                refetchQueries: [{ query: GET_SAVED_POSTS }],
                // ── Actualización del caché: usa modify (no necesita gql) ──
                update: (cache, { data }) => {
                    const cacheId = cache.identify({
                        __typename: item.__typename || 'Post',
                        id: item.id,
                    });
                    if (!cacheId) return;
                    cache.modify({
                        id: cacheId,
                        fields: {
                            isSaved: () => !!data?.toggleSavePost,
                        },
                    });
                },
            });
            Toast.show({
                type: 'success',
                text1: wasSaved ? 'Quitado de guardados' : 'Guardado correctamente',
                position: 'bottom'
            });
        } catch (err) {
            console.error('Error toggling save:', err);
            Toast.show({
                type: 'error',
                text1: 'No se pudo procesar la acción',
                position: 'bottom'
            });
        }
    }, [toggleSavePost]);

    const isFetchingMore = networkStatus === 3;

    const loadMorePosts = useCallback(() => {
        if (loading || isFetchingMore || !hasMore || !data?.getFeed?.length) return;

        fetchMore({
            variables: {
                offset: data.getFeed.length,
                limit: 10,
            },
        }).then((fetchMoreResult) => {
            if (!fetchMoreResult.data || fetchMoreResult.data.getFeed.length < 10) {
                setHasMore(false);
            }
        });
    }, [data?.getFeed?.length, fetchMore, loading, isFetchingMore, hasMore]);

    const handleRefresh = useCallback(async () => {
        setHasMore(true);
        await refetch();
    }, [refetch]);

    // Sincronización de post eliminada: 
    // CommentsModal ya busca la versión más reciente del post en data?.getFeed en la prop "post".

    // Lógica para el botón de Home (Scroll + Refresh)
    useEffect(() => {
        const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
            // Si el usuario ya está en esta pantalla
            if (isFocused) {
                if (scrollOffset > 20) {
                    // Si ha bajado, subir al inicio
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                } else {
                    // Si ya está arriba, recargar
                    handleRefresh();
                }
            }
        });
        return unsubscribe;
    }, [navigation, isFocused, scrollOffset, handleRefresh]);

    useFocusEffect(
        useCallback(() => {
            if (resumeCommentsRef.current) {
                const timer = setTimeout(() => {
                    setSelectedPostForComments(resumeCommentsRef.current);
                    resumeCommentsRef.current = null;
                }, 300);
                return () => clearTimeout(timer);
            }
        }, [])
    );

    const renderFooter = useCallback(() => {
        if (isFetchingMore) {
            return (
                <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            );
        }

        if (!hasMore && data?.getFeed?.length > 0) {
            return <ListFooter />;
        }

        return null;
    }, [isFetchingMore, colors.primary, hasMore, data?.getFeed?.length]);

    const handleOptionsPress = useCallback((item: any) => {
        setSelectedPost(item);
        setIsOptionsMenuVisible(true);
    }, []);

    const handleCreatePostPress = useCallback(() => {
        setEditingPostId(undefined);
        setEditingPostContent('');
        setEditingPostTitle('');
        setIsModalVisible(true);
    }, []);

    const renderEmpty = useCallback(() => {
        if (loading && networkStatus === 1) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={80} color={colors.textSecondary} style={{ opacity: 0.2, marginBottom: 20 }} />
                <Text style={styles.emptyTextTitle}>No hay publicaciones aún</Text>
                <Text style={styles.emptyTextSub}>¡Vuelve a intentar recargar el contenido para ver si hay algo nuevo!</Text>
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={handleRefresh}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.emptyButtonGradient}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="refresh-outline" size={20} color="white" />
                            <Text style={styles.emptyButtonText}>Actualizar</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }, [loading, networkStatus, colors, styles, handleRefresh]);

    // Configuración para detectar visibilidad de elementos
    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        if (!viewableItems || viewableItems.length === 0) {
            setVisiblePostId(null);
            return;
        }
        const mostVisible = viewableItems.reduce((best: any, cur: any) => {
            return (cur.percentVisible ?? 0) > (best.percentVisible ?? 0) ? cur : best;
        }, viewableItems[0]);
        setVisiblePostId(mostVisible?.item?.id ?? null);
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50, // 50% visible para activar autoplay
        minimumViewTime: 0,
    }).current;

    const renderFeedItem = useCallback(({ item }: { item: any }) => {
        if (item.isAd) {
            // Fusionar el item del feed con los datos cacheados del anuncio (que incluyen el realId)
            const cachedAdData = loadedAds[item.id];
            const adDataToPass = cachedAdData
                ? { ...cachedAdData, id: cachedAdData.realId || cachedAdData.id } // Siempre usar el UUID real
                : (item.type || item.title ? { ...item, id: item.realId || item.id } : undefined);
            return <NativeAdCard
                adData={adDataToPass}
                onAdLoaded={(adData) => {
                    if (!loadedAds[item.id]) {
                        setLoadedAds(prev => ({ ...prev, [item.id]: adData }));
                    }
                }}
                onDelete={() => {
                    // Marcar el anuncio como borrado en el caché local del feed
                    setLoadedAds(prev => ({ ...prev, [item.id]: { ...prev[item.id], isDeleted: true } }));
                }}
                onPress={(ad) => setSelectedPostForComments({
                    post: { ...ad, id: item.id, realId: ad.realId || ad.id },
                    minimize: true,
                    initialTab: 'comments',
                    initialExpanded: false
                })}
            />;
        }

        if (item.__typename === 'JobOffer') {
            const mappedItem = {
                ...item,
                title: item.jobTitle ?? item.postTitle ?? item.title,
                media: item.jobMedia ?? item.postMedia ?? item.media ?? [],
                location: item.jobLocation ?? item.location,
                contactPhone: item.jobContactPhone ?? item.contactPhone
            };
            return <JobOfferCard
                item={mappedItem}
                onPress={() => setSelectedPostForComments({ post: mappedItem, minimize: true, initialTab: 'comments', initialExpanded: false })}
                onEdit={(itemToEdit) => {
                    router.push({
                        pathname: '/jobs/create',
                        params: {
                            editId: itemToEdit.id,
                            editData: JSON.stringify(itemToEdit),
                            initialTab: 'job'
                        }
                    });
                }}
                onToggleSave={() => handleToggleSave(mappedItem)}
                isSaved={item.isSaved}
                isFocused={isFocused}
                isViewable={item.id === visiblePostId}
                isOverlayActive={!!selectedPostForComments || isModalVisible}
            />;
        }
        if (item.__typename === 'ProfessionalProfile') {
            const mappedItem = {
                ...item,
                media: item.profMedia ?? item.postMedia ?? item.media ?? [],
                contactPhone: item.profContactPhone ?? item.contactPhone
            };
            return <ProfessionalCard
                item={mappedItem}
                onPress={() => setSelectedPostForComments({ post: mappedItem, minimize: true, initialTab: 'comments', initialExpanded: false })}
                onEdit={(itemToEdit) => {
                    router.push({
                        pathname: '/jobs/create',
                        params: {
                            editId: itemToEdit.id,
                            editData: JSON.stringify(itemToEdit),
                            initialTab: 'service'
                        }
                    });
                }}
                onToggleSave={() => handleToggleSave(mappedItem)}
                isSaved={item.isSaved}
                isFocused={isFocused}
                isViewable={item.id === visiblePostId}
                isOverlayActive={!!selectedPostForComments || isModalVisible}
            />;
        }
        if (item.__typename === 'StoreProduct') {
            const mappedItem = {
                ...item,
                title: item.storeTitle ?? item.postTitle ?? item.title,
                media: item.storeMedia ?? item.postMedia ?? item.media ?? [],
                location: item.storeLocation ?? item.location,
                contactPhone: item.storeContactPhone ?? item.contactPhone,
            };
            return <StoreProductCard
                item={mappedItem}
                onPress={() => setSelectedPostForComments({ post: mappedItem, minimize: true, initialTab: 'comments', initialExpanded: false })}
                onCommentPress={() => setSelectedPostForComments({ post: mappedItem, minimize: false, initialTab: 'comments', initialExpanded: false })}
                onEdit={(itemToEdit) => {
                    setEditingProduct(itemToEdit);
                    setIsStoreModalVisible(true);
                }}
                onToggleSave={() => handleToggleSave(mappedItem)}
                isSaved={item.isSaved}
                isViewable={item.id === visiblePostId && isFocused && !selectedPostForComments}
            />;
        }

        // Default: Post
        const mappedPost = {
            ...item,
            title: item.postTitle ?? item.title,
            media: item.postMedia ?? item.media ?? []
        };

        return (
            <PostCard
                item={mappedPost}
                currentUserId={currentUser?.id}
                onOptionsPress={handleOptionsPress}
                onOpenComments={(_, initialTab, minimize, initialExpanded) =>
                    setSelectedPostForComments({ post: mappedPost, minimize: !!minimize, initialTab, initialExpanded })
                }
                onToggleSave={() => handleToggleSave(mappedPost)}
                isSaved={item.isSaved}
                isViewable={item.id === visiblePostId}
                isFocused={isFocused}
                isOverlayActive={!!selectedPostForComments || isModalVisible}
            />
        );
    }, [currentUser?.id, handleOptionsPress, visiblePostId, isFocused, selectedPostForComments, isModalVisible, loadedAds, handleToggleSave]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            {/* Cabecera Tipo Facebook */}
            <View style={styles.topHeader}>
                <View style={styles.brandContainer}>
                    <Image
                        source={colors.logo}
                        style={styles.brandLogo}
                        resizeMode="contain"
                    />
                    <MaskedView
                        style={{ flex: 1, flexDirection: 'row' }}
                        maskElement={
                            <View style={{ backgroundColor: 'transparent', flex: 1, justifyContent: 'center' }}>
                                <Text style={styles.brandTitle} numberOfLines={1} adjustsFontSizeToFit>{Constants.expoConfig?.name || 'Red Social'}</Text>
                            </View>
                        }
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary, colors.accent]}
                            locations={[0, 0.5, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            <Text style={[styles.brandTitle, { opacity: 0 }]} numberOfLines={1} adjustsFontSizeToFit>{Constants.expoConfig?.name || 'Red Social'}</Text>
                        </LinearGradient>
                    </MaskedView>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/search')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="search-outline" size={22} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => setIsMenuVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="menu-outline" size={26} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Ya no ponemos el createPostContainer aquí fijo, irá en el ListHeaderComponent del FlatList */}

            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {(loading && networkStatus === 1) || (!data && loading && networkStatus !== 3) ? (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : error && !data ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4, marginBottom: 12 }} />
                        <Text style={styles.errorText}>No se pudieron cargar las publicaciones</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>
                            {getFriendlyErrorMessage(error)}
                        </Text>
                        <TouchableOpacity onPress={handleRefresh} style={[styles.emptyButton, { marginTop: 16 }]}>
                            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyButtonGradient}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="refresh-outline" size={20} color="white" />
                                    <Text style={styles.emptyButtonText}>Reintentar</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        ListHeaderComponent={
                            <>
                                {/* ARCHITECTURE TASK 3: Barra de historias primero con aislamiento de sesión */}
                                <StoriesBar key={currentUser?.id || 'anonymous'} />

                                {/* Input "Crear Publicación" ahora debajo de las historias */}
                                <View style={styles.createPostContainer}>
                                    <View style={styles.createPostRow}>
                                        <TouchableOpacity
                                            style={[styles.smallAvatarPlaceholder, { overflow: 'hidden', backgroundColor: currentUser && !currentUser.photoUrl ? 'rgba(255, 101, 36, 0.15)' : colors.surface }]}
                                            onPress={() => navigation.navigate('Profile' as never)}
                                        >
                                            {currentUser?.photoUrl ? (
                                                <Image source={{ uri: currentUser.photoUrl }} style={{ width: '100%', height: '100%' }} />
                                            ) : currentUser ? (
                                                <Text style={[styles.avatarText, { fontSize: 14 }]}>
                                                    {currentUser.firstName?.charAt(0) || ''}{currentUser.lastName?.charAt(0) || ''}
                                                </Text>
                                            ) : (
                                                <Ionicons name="person" size={20} color={colors.textSecondary} />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.fakeInput}
                                            activeOpacity={0.7}
                                            onPress={handleCreatePostPress}
                                        >
                                            <Text style={styles.fakeInputText}>¿Qué está pasando en {Constants.expoConfig?.extra?.cityName || 'tu ciudad'}?</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        }
                        data={augmentedFeed}
                        extraData={augmentedFeed}
                        keyExtractor={(item) => `${item.__typename}-${item.id}`}
                        renderItem={renderFeedItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshing={loading && networkStatus !== 3}
                        onRefresh={handleRefresh}
                        onScroll={(event) => {
                            setScrollOffset(event.nativeEvent.contentOffset.y);
                        }}
                        onEndReached={loadMorePosts}
                        onEndReachedThreshold={0.5}
                        ItemSeparatorComponent={() => <View style={styles.feedDivider} />}
                        ListFooterComponent={renderFooter}
                        ListEmptyComponent={renderEmpty}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        initialNumToRender={2}
                        maxToRenderPerBatch={2}
                        windowSize={5}
                        scrollEventThrottle={16}
                        removeClippedSubviews={Platform.OS === 'android'}
                    />
                )}
            </View>

            {/* Modal para Crear/Editar Publicación */}
            <CreatePostModal
                visible={isModalVisible}
                onClose={() => {
                    setIsModalVisible(false);
                }}
                postId={editingPostId}
                initialContent={editingPostContent}
                initialTitle={editingPostTitle}
                initialMedia={editingPostMedia}
            />

            {/* Modal Menú de Opciones de la Publicación Inferior */}
            <PostOptionsModal
                visible={isOptionsMenuVisible}
                onClose={() => setIsOptionsMenuVisible(false)}
                post={selectedPost}
                isOwner={
                    selectedPost?.author?.id === currentUser?.id ||
                    selectedPost?.seller?.id === currentUser?.id ||
                    selectedPost?.user?.id === currentUser?.id
                }
                onReport={() => {
                    setIsOptionsMenuVisible(false);
                    setIsReportModalVisible(true);
                }}
                onToggleSave={() => handleToggleSave(selectedPost)}
                isSaved={selectedPost?.isSaved}
                onEdit={() => {
                    if (selectedPost) {
                        const type = selectedPost.__typename;
                        setIsOptionsMenuVisible(false);
                        // Ya no cerramos el CommentsModal aquí para que permanezca abierto al terminar de editar

                        if (type === 'StoreProduct') {
                            setEditingProduct({ ...selectedPost, id: selectedPost.realId || selectedPost.id });
                            setIsStoreModalVisible(true);
                        } else if (type === 'Ad' || selectedPost.isAd) {
                            setEditingLocalAd({ ...selectedPost, id: selectedPost.realId || selectedPost.id });
                            setIsLocalAdModalVisible(true);
                        } else if (type === 'JobOffer' || type === 'ProfessionalProfile') {
                            router.push({
                                pathname: '/jobs/create',
                                params: {
                                    editId: selectedPost.realId || selectedPost.id,
                                    editData: JSON.stringify({ ...selectedPost, id: selectedPost.realId || selectedPost.id }),
                                    initialTab: type === 'ProfessionalProfile' ? 'service' : 'offer'
                                }
                            });
                        } else {
                            // Default: Post
                            setEditingPostId(selectedPost.realId || selectedPost.id);
                            setEditingPostContent(selectedPost.content);
                            setEditingPostTitle(selectedPost.title || '');
                            setEditingPostMedia(selectedPost.media || []);
                            setIsModalVisible(true);
                        }
                    }
                }}
                onDelete={() => {
                    if (selectedPost) {
                        const type = selectedPost.__typename;
                        setIsOptionsMenuVisible(false);

                        // Determinar cuál será la siguiente publicación a mostrar
                        const feed = data?.getFeed || [];
                        const currentIndex = feed.findIndex((p: any) => p.id === selectedPost.id);
                        let targetPost = null;

                        if (currentIndex !== -1) {
                            if (currentIndex < feed.length - 1) {
                                targetPost = feed[currentIndex + 1];
                            } else if (currentIndex > 0) {
                                targetPost = feed[currentIndex - 1];
                            }
                        }

                        const afterDelete = (deletedId: string, typename: string) => {
                            // Evict from Apollo cache — removes item from ALL cached queries instantly
                            apolloClient.cache.evict({ id: apolloClient.cache.identify({ __typename: typename, id: deletedId }) });
                            apolloClient.cache.gc();

                            const label = type === 'StoreProduct' ? 'Producto' : type === 'JobOffer' ? 'Oferta' : type === 'ProfessionalProfile' ? 'Servicio' : 'Publicación';
                            setTimeout(() => Toast.show({
                                type: 'success',
                                text1: 'Eliminado',
                                text2: `${label} borrada con éxito`,
                            }), 350);

                            // Solo navegar si el CommentsModal estaba abierto al momento de eliminar
                            if (selectedPostForComments) {
                                if (targetPost) {
                                    setSelectedPostForComments({
                                        post: targetPost,
                                        minimize: !!selectedPostForComments?.minimize,
                                        initialTab: selectedPostForComments?.initialTab,
                                        initialExpanded: false
                                    });
                                } else {
                                    setSelectedPostForComments(null);
                                }
                            }
                        };

                        const onError = (err: any) => Toast.show({ type: 'error', text1: 'Error', text2: err.message });

                        const targetId = selectedPost.realId || selectedPost.id;

                        if (!type || type === 'Post') {
                            deletePost({ variables: { id: targetId } }).then(() => afterDelete(targetId, 'Post')).catch(onError);
                        } else if (type === 'StoreProduct') {
                            deleteStoreProduct({ variables: { id: targetId } }).then(() => afterDelete(targetId, 'StoreProduct')).catch(onError);
                        } else if (type === 'JobOffer') {
                            deleteJobOffer({ variables: { id: targetId } }).then(() => afterDelete(targetId, 'JobOffer')).catch(onError);
                        } else if (type === 'ProfessionalProfile') {
                            deleteProfessionalProfile({ variables: { id: targetId } }).then(() => afterDelete(targetId, 'ProfessionalProfile')).catch(onError);
                        }
                    }
                }}
            />

            {/* Modal para Editar Producto desde el Feed */}
            <CreateProductModal
                visible={isStoreModalVisible}
                onClose={() => {
                    setIsStoreModalVisible(false);
                    setEditingProduct(null);
                    handleRefresh();
                }}
                editItem={editingProduct}
            />

            {/* Modal para Editar Anuncio Local desde el Feed */}
            <CreateLocalAdModal
                visible={isLocalAdModalVisible}
                onClose={() => {
                    setIsLocalAdModalVisible(false);
                    setEditingLocalAd(null);
                }}
                onSuccess={(updatedAd) => {
                    setIsLocalAdModalVisible(false);
                    if (updatedAd && editingLocalAd) {
                        // Encontrar la clave posicional en loadedAds y actualizar los datos en tiempo real
                        const posKey = Object.keys(loadedAds).find(
                            key => loadedAds[key]?.id === editingLocalAd.id || loadedAds[key]?.realId === editingLocalAd.id
                        );
                        if (posKey) {
                            setLoadedAds(prev => ({
                                ...prev,
                                [posKey]: {
                                    ...prev[posKey],
                                    ...updatedAd,
                                    realId: updatedAd.id, // Preservar UUID real
                                    type: 'LOCAL',
                                },
                            }));
                        }
                    }
                    setEditingLocalAd(null);
                }}
                ad={editingLocalAd}
            />

            {/* CommentsModal — siempre montado para mantener estado y UI fluida */}
            <CommentsModal
                visible={!!selectedPostForComments}
                post={
                    selectedPostForComments
                        ? (selectedPostForComments.post?.isAd
                            ? selectedPostForComments.post
                            : (augmentedFeed.find((p: any) => p.id === selectedPostForComments.post?.id) ?? selectedPostForComments.post))
                        : null
                }
                nextPost={(() => {
                    const feed = augmentedFeed;
                    const currentIndex = feed.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (currentIndex !== -1 && currentIndex < feed.length - 1) ? feed[currentIndex + 1] : null;
                })()}
                prevPost={(() => {
                    const feed = augmentedFeed;
                    const currentIndex = feed.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (currentIndex > 0) ? feed[currentIndex - 1] : null;
                })()}
                onClose={() => {
                    setSelectedPostForComments(null);
                }}
                onRefreshPost={refetch}
                onDelete={() => {
                    if (selectedPostForComments?.post?.id) {
                        const adId = selectedPostForComments.post.id;
                        setLoadedAds(prev => ({ ...prev, [adId]: { ...prev[adId], isDeleted: true } }));
                    }
                }}
                initialMinimized={selectedPostForComments?.minimize}
                initialTab={selectedPostForComments?.initialTab}
                initialExpanded={selectedPostForComments?.initialExpanded}
                onNextPost={() => {
                    const feed = augmentedFeed;
                    const currentIndex = feed.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);

                    if (currentIndex !== -1) {
                        if (currentIndex >= feed.length - 3 && hasMore && !isFetchingMore) {
                            loadMorePosts();
                        }
                        if (currentIndex < feed.length - 1) {
                            setSelectedPostForComments({
                                post: feed[currentIndex + 1],
                                minimize: !!selectedPostForComments?.minimize,
                                initialTab: selectedPostForComments?.initialTab,
                                initialExpanded: false,
                            });
                        } else if (hasMore) {
                            Toast.show({ type: 'info', text1: 'Cargando más...', text2: 'Por favor, intenta deslizar de nuevo en un segundo.' });
                            if (!isFetchingMore) loadMorePosts();
                        } else {
                            Toast.show({ type: 'info', text1: 'Has visto todo', text2: 'Llegaste al final de las publicaciones.' });
                        }
                    }
                }}
                onPrevPost={() => {
                    const feed = augmentedFeed;
                    const currentIndex = feed.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex > 0) {
                        setSelectedPostForComments({
                            post: feed[currentIndex - 1],
                            minimize: !!selectedPostForComments?.minimize,
                            initialTab: selectedPostForComments?.initialTab,
                            initialExpanded: false,
                        });
                    }
                }}
                onOptionsPress={(post) => {
                    setSelectedPost(post);
                    setIsOptionsMenuVisible(true);
                }}
                hasMorePosts={hasMore}
            />

            <ReportModal
                visible={isReportModalVisible}
                onClose={() => setIsReportModalVisible(false)}
                reportedItemId={selectedPost?.realId || selectedPost?.id || ''}
                reportedItemType={
                    selectedPost?.__typename === 'StoreProduct' ? 'PRODUCT' :
                        selectedPost?.__typename === 'JobOffer' ? 'JOB_OFFER' :
                            selectedPost?.__typename === 'ProfessionalProfile' ? 'SERVICE' :
                                'POST'
                }
                onContentDeleted={() => {
                    if (selectedPost) {
                        apolloClient.cache.evict({ id: apolloClient.cache.identify({ __typename: selectedPost.__typename, id: selectedPost.id }) });
                        apolloClient.cache.gc();
                    }
                    setIsReportModalVisible(false);
                }}
            />

            {/* Menú lateral de configuración */}
            <Modal visible={isMenuVisible} animationType="fade" transparent onRequestClose={handleCloseMenu}>
                <TouchableWithoutFeedback onPress={handleCloseMenu}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalContent, { paddingTop: Math.max(insets.top, 20) + 10, paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
                                <View style={[styles.drawerHeader, menuView === 'notifications' && { justifyContent: 'flex-start' }]}>
                                    <TouchableOpacity 
                                        onPress={menuView !== 'main' ? () => setMenuView(menuView === 'changePassword' ? 'account' : 'main') : handleCloseMenu} 
                                        style={[styles.drawerCloseBtn, menuView === 'notifications' && { marginRight: 16 }]}
                                    >
                                        <Ionicons 
                                            name={menuView !== 'main' ? "arrow-back" : "close"} 
                                            size={28} 
                                            color={colors.text} 
                                        />
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>
                                        {menuView === 'account' 
                                            ? 'Configuración de cuenta' 
                                            : menuView === 'notifications'
                                                ? 'Notificaciones'
                                                : menuView === 'changePassword'
                                                    ? 'Cambiar contraseña'
                                                    : 'Configuración'}
                                    </Text>
                                    {menuView !== 'notifications' && <View style={{ width: 28 }} />}
                                </View>
                                
                                {menuView === 'main' ? (
                                    <>
                                        {isAdmin && (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.settingButton}
                                                    onPress={() => { handleCloseMenu(); setTimeout(() => (navigation as any).navigate('Moderation', { initialTab: 'reports' }), 300); }}
                                                >
                                                    <View style={styles.settingLeft}>
                                                        <View style={{ backgroundColor: 'rgba(255,101,36,0.12)', borderRadius: 10, padding: 4, marginRight: 4 }}>
                                                            <Ionicons name="shield-checkmark-outline" size={22} color="#FF6524" />
                                                        </View>
                                                        <Text style={[styles.settingText, { color: '#FF6524' }]}>Moderación</Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={20} color="#FF6524" />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.settingButton}
                                                    onPress={() => { handleCloseMenu(); setTimeout(() => (navigation as any).navigate('Admin'), 300); }}
                                                >
                                                    <View style={styles.settingLeft}>
                                                        <View style={{ backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 10, padding: 4, marginRight: 4 }}>
                                                            <Ionicons name="settings-outline" size={22} color="#6366F1" />
                                                        </View>
                                                        <Text style={[styles.settingText, { color: '#6366F1' }]}>Administración</Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={20} color="#6366F1" />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                        <TouchableOpacity
                                            style={styles.settingButton}
                                            onPress={() => { handleCloseMenu(); setTimeout(() => setIsThemeModalVisible(true), 400); }}
                                        >
                                            <View style={styles.settingLeft}>
                                                <Ionicons name="color-palette-outline" size={24} color={colors.text} />
                                                <Text style={styles.settingText}>Tema</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.settingButton}
                                            onPress={() => { handleCloseMenu(); setTimeout(() => setIsBlockedUsersVisible(true), 300); }}
                                        >
                                            <View style={styles.settingLeft}>
                                                <Ionicons name="lock-closed-outline" size={24} color={colors.text} />
                                                <Text style={styles.settingText}>Bloqueados</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.settingButton}
                                            onPress={() => {
                                                handleCloseMenu();
                                                setTimeout(() => {
                                                    router.push('/ads/info');
                                                }, 300);
                                            }}
                                        >
                                            <View style={styles.settingLeft}>
                                                <Ionicons name="megaphone-outline" size={24} color={colors.text} />
                                                <Text style={styles.settingText}>Publicidad</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.settingButton}
                                            onPress={() => setMenuView('notifications')}
                                        >
                                            <View style={styles.settingLeft}>
                                                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                                                <Text style={styles.settingText}>Notificaciones</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.settingButton}
                                            onPress={() => setMenuView('account')}
                                        >
                                            <View style={styles.settingLeft}>
                                                <Ionicons name="settings-outline" size={24} color={colors.text} />
                                                <Text style={styles.settingText}>Configuración de cuenta</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <View style={styles.spacer} />
                                        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                                            <Ionicons name="log-out-outline" size={24} color={colors.error} />
                                            <Text style={styles.logoutText}>Cerrar Sesión</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : menuView === 'notifications' ? (
                                    <>
                                        <View style={styles.notificationPrefContainer}>
                                            <View style={styles.notificationPrefRow}>
                                                <View style={styles.notificationPrefLeft}>
                                                    <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                                        <Ionicons name="information-circle-outline" size={22} color={colors.text} />
                                                    </View>
                                                    <View style={styles.notificationPrefTextWrapper}>
                                                        <Text style={[styles.settingText, { color: colors.text, marginLeft: 0, textAlign: 'left' }]}>Sistema</Text>
                                                        <Text style={[styles.settingSubtext, { color: colors.textSecondary, textAlign: 'left' }]}>Notificaciones generales y avisos oficiales</Text>
                                                    </View>
                                                </View>
                                                <Switch
                                                    value={receiveSystem}
                                                    onValueChange={(val) => handleTogglePreference('system', val)}
                                                    trackColor={{ false: '#767577', true: colors.primary + '80' }}
                                                    thumbColor={receiveSystem ? colors.primary : '#f4f3f4'}
                                                />
                                            </View>

                                            <View style={styles.notificationPrefRow}>
                                                <View style={styles.notificationPrefLeft}>
                                                    <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                                        <Ionicons name="shield-half-outline" size={22} color={colors.text} />
                                                    </View>
                                                    <View style={styles.notificationPrefTextWrapper}>
                                                        <Text style={[styles.settingText, { color: colors.text, marginLeft: 0, textAlign: 'left' }]}>Moderación</Text>
                                                        <Text style={[styles.settingSubtext, { color: colors.textSecondary, textAlign: 'left' }]}>Reportes, apelaciones y advertencias</Text>
                                                    </View>
                                                </View>
                                                <Switch
                                                    value={receiveModeration}
                                                    onValueChange={(val) => handleTogglePreference('moderation', val)}
                                                    trackColor={{ false: '#767577', true: colors.primary + '80' }}
                                                    thumbColor={receiveModeration ? colors.primary : '#f4f3f4'}
                                                />
                                            </View>

                                            <View style={styles.notificationPrefRow}>
                                                <View style={styles.notificationPrefLeft}>
                                                    <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.text} />
                                                    </View>
                                                    <View style={styles.notificationPrefTextWrapper}>
                                                        <Text style={[styles.settingText, { color: colors.text, marginLeft: 0, textAlign: 'left' }]}>Social</Text>
                                                        <Text style={[styles.settingSubtext, { color: colors.textSecondary, textAlign: 'left' }]}>Mensajes directos, me gusta y comentarios</Text>
                                                    </View>
                                                </View>
                                                <Switch
                                                    value={receiveSocial}
                                                    onValueChange={(val) => handleTogglePreference('social', val)}
                                                    trackColor={{ false: '#767577', true: colors.primary + '80' }}
                                                    thumbColor={receiveSocial ? colors.primary : '#f4f3f4'}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.spacer} />
                                    </>
                                ) : menuView === 'account' ? (
                                    <>
                                        <TouchableOpacity
                                            style={styles.settingButton}
                                            onPress={() => setMenuView('changePassword')}
                                        >
                                            <View style={styles.settingLeft}>
                                                <Ionicons name="key-outline" size={24} color={colors.text} />
                                                <Text style={styles.settingText}>Cambiar contraseña</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.settingButton}
                                            onPress={() => {
                                                handleCloseMenu();
                                                setTimeout(() => {
                                                    handleDeleteAccount();
                                                }, 300);
                                            }}
                                        >
                                            <View style={styles.settingLeft}>
                                                <Ionicons name="trash-outline" size={24} color={colors.error} />
                                                <Text style={[styles.settingText, { color: colors.error }]}>Eliminar Cuenta</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                        <View style={styles.spacer} />
                                    </>
                                ) : (
                                    <>
                                        {/* Contenido de Cambiar Contraseña */}
                                        <View style={styles.formContainer}>
                                            <View style={styles.formGroup}>
                                                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Contraseña Actual</Text>
                                                <View style={[styles.formInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                    <TextInput
                                                        style={[styles.formInput, { color: colors.text }]}
                                                        secureTextEntry
                                                        value={oldPassword}
                                                        onChangeText={setOldPassword}
                                                        placeholder="Ingresa tu contraseña actual"
                                                        placeholderTextColor={colors.textSecondary + '80'}
                                                    />
                                                </View>
                                            </View>

                                            <View style={styles.formGroup}>
                                                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nueva Contraseña</Text>
                                                <View style={[styles.formInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                    <TextInput
                                                        style={[styles.formInput, { color: colors.text }]}
                                                        secureTextEntry
                                                        value={newPassword}
                                                        onChangeText={setNewPassword}
                                                        placeholder="Mínimo 6 caracteres"
                                                        placeholderTextColor={colors.textSecondary + '80'}
                                                     />
                                                </View>
                                            </View>

                                            <View style={styles.formGroup}>
                                                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Confirmar Nueva Contraseña</Text>
                                                <View style={[styles.formInputWrapper, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                    <TextInput
                                                        style={[styles.formInput, { color: colors.text }]}
                                                        secureTextEntry
                                                        value={confirmNewPassword}
                                                        onChangeText={setConfirmNewPassword}
                                                        placeholder="Repite tu nueva contraseña"
                                                        placeholderTextColor={colors.textSecondary + '80'}
                                                    />
                                                </View>
                                            </View>

                                            <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 10, marginBottom: 8 }]}>Cerrar sesión en:</Text>
                                            <View style={styles.sessionOptions}>
                                                <TouchableOpacity 
                                                    style={styles.radioOption} 
                                                    onPress={() => setLogoutAllDevices(true)}
                                                >
                                                    <View style={[styles.radioCircle, { borderColor: colors.border }]}>
                                                        {logoutAllDevices && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                                                    </View>
                                                    <Text style={[styles.radioLabel, { color: colors.text }]}>Todos los dispositivos</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity 
                                                    style={styles.radioOption} 
                                                    onPress={() => setLogoutAllDevices(false)}
                                                >
                                                    <View style={[styles.radioCircle, { borderColor: colors.border }]}>
                                                        {!logoutAllDevices && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                                                    </View>
                                                    <Text style={[styles.radioLabel, { color: colors.text }]}>Solo en este dispositivo</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <TouchableOpacity
                                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                                onPress={handleChangePassword}
                                                disabled={isChangingPassword}
                                            >
                                                {isChangingPassword ? (
                                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                                ) : (
                                                    <Text style={styles.submitButtonText}>Actualizar Contraseña</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Modal personalizado de confirmación de eliminación de cuenta */}
            <Modal
                visible={isConfirmDeleteVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsConfirmDeleteVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsConfirmDeleteVisible(false)}>
                    <View style={styles.confirmModalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.confirmModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={styles.confirmModalIconContainer}>
                                    <Ionicons name="warning" size={30} color="#EF4444" />
                                </View>
                                <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
                                    ¿Eliminar tu cuenta?
                                </Text>
                                <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                                    Tu cuenta se desactivará e invisibilizará de inmediato. Tendrás un plazo de 30 días para volver a iniciar sesión y reactivar tu cuenta con todo tu contenido si cambias de opinión. Pasado ese tiempo, tu perfil y datos se eliminarán de forma definitiva e irreversible.
                                </Text>
                                <View style={styles.confirmModalButtons}>
                                    <TouchableOpacity
                                        style={[styles.confirmModalButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        onPress={() => setIsConfirmDeleteVisible(false)}
                                    >
                                        <Text style={[styles.confirmModalCancelText, { color: colors.text }]}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.confirmModalButton, styles.confirmModalDeleteButton]}
                                        onPress={() => {
                                            setIsConfirmDeleteVisible(false);
                                            deleteAccount();
                                        }}
                                    >
                                        <Text style={styles.confirmModalDeleteText}>Eliminar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Modal de Alerta Personalizado */}
            <Modal
                visible={!!customAlert?.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setCustomAlert(null)}
            >
                <TouchableWithoutFeedback onPress={() => { if (customAlert?.type !== 'success') setCustomAlert(null); }}>
                    <View style={styles.confirmModalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.confirmModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={[styles.confirmModalIconContainer, { backgroundColor: customAlert?.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                                    <Ionicons 
                                        name={customAlert?.type === 'success' ? "checkmark-circle" : "alert-circle"} 
                                        size={30} 
                                        color={customAlert?.type === 'success' ? "#10B981" : "#EF4444"} 
                                    />
                                </View>
                                <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
                                    {customAlert?.title}
                                </Text>
                                <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                                    {customAlert?.message}
                                </Text>
                                <View style={styles.confirmModalButtons}>
                                    <TouchableOpacity
                                        style={[styles.confirmModalButton, { backgroundColor: customAlert?.type === 'success' ? "#10B981" : colors.primary }]}
                                        onPress={() => {
                                            const action = customAlert?.onPress;
                                            setCustomAlert(null);
                                            if (action) action();
                                        }}
                                    >
                                        <Text style={[styles.confirmModalCancelText, { color: 'white', fontWeight: 'bold' }]}>Aceptar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ThemeSelectorModal
                visible={isThemeModalVisible}
                onClose={() => setIsThemeModalVisible(false)}
                currentTheme={themeMode}
                onSelectTheme={(theme) => setThemeMode(theme)}
            />

            <BlockedUsersModal
                visible={isBlockedUsersVisible}
                onClose={() => setIsBlockedUsersVisible(false)}
            />

        </SafeAreaView>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8, // Sleek, modern compact vertical padding
        borderBottomWidth: 0.5, // Thinner border
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    brandContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandLogo: {
        width: 44,
        height: 44,
        marginRight: 12,
        borderRadius: 12, // Modern squircle rounded shape
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    brandTitle: {
        fontSize: 24, // Larger, more premium size
        fontWeight: '900', // Extra bold weight to highlight the color gradient
        letterSpacing: 0.3, // Premium typographic letter spacing
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // Better separation
        flexShrink: 0,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', // Modern translucent backings
        justifyContent: 'center',
        alignItems: 'center',
    },
    createPostContainer: {
        padding: 10,
        borderBottomWidth: 6,
        backgroundColor: colors.background,
        borderBottomColor: colors.surface,
    },
    createPostRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
        textTransform: 'uppercase',
    },
    smallAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fakeInput: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 20,
        paddingHorizontal: 16,
        justifyContent: 'center',
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fakeInputText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    listContainer: {
        paddingBottom: 24,
        paddingTop: 8,
    },
    loader: {
        marginTop: 40,
    },
    errorText: {
        color: colors.error,
        textAlign: 'center',
        marginTop: 40,
    },
    emptyContainer: {
        paddingVertical: 60,
        paddingHorizontal: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTextTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyTextSub: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    emptyButton: {
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    emptyButtonGradient: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Estilos del Modal de Configuración
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-start', alignItems: 'flex-end' },
    modalContent: {
        backgroundColor: colors.background, width: '75%', height: '100%',
        paddingHorizontal: 20, paddingBottom: 40,
        borderLeftWidth: 1, borderLeftColor: colors.border,
    },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    drawerCloseBtn: { padding: 4 },
    settingButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center' },
    settingText: { fontSize: 16, color: colors.text, marginLeft: 16 },
    spacer: { flex: 1 },
    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 16,
        backgroundColor: isDark ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 82, 82, 0.05)',
        marginBottom: 20, marginTop: 10,
    },
    logoutText: { color: colors.error, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    feedDivider: {
        height: 0.6,
        backgroundColor: '#BDBDBD',
        opacity: 0.35,
        marginTop: 6,
        marginBottom: 10,
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmModalContent: {
        width: '85%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    confirmModalIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    confirmModalMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    confirmModalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    confirmModalButton: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmModalCancelText: {
        fontWeight: '600',
        fontSize: 14,
    },
    confirmModalDeleteButton: {
        backgroundColor: '#EF4444',
    },
    confirmModalDeleteText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    notificationPrefContainer: {
        width: '100%',
        paddingHorizontal: 8,
        gap: 20,
        marginTop: 10,
    },
    notificationPrefRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    notificationPrefLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    notificationPrefTextWrapper: {
        marginLeft: 12,
        flex: 1,
    },
    settingSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
    iconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formContainer: {
        width: '100%',
        marginTop: 10,
        gap: 16,
    },
    formGroup: {
        width: '100%',
        gap: 6,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    formInputWrapper: {
        borderWidth: 1,
        borderRadius: 12,
        height: 48,
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    formInput: {
        fontSize: 15,
        padding: 0,
    },
    sessionOptions: {
        gap: 12,
        marginBottom: 8,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    radioLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    submitButton: {
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
