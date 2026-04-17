import React, { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, RefreshControl, Platform, FlatList, TextInput, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useAuth } from '../../auth/context/AuthContext';
import ThemeSelectorModal from '../../../components/ThemeSelectorModal';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { GET_USER_PROFILE, CREATE_REPORT, GET_MY_REPORT_STATUS } from '../graphql/profile.operations';
import { DELETE_POST, GET_POSTS } from '../../feed/graphql/posts.operations';
import { TOGGLE_FOLLOW, IS_FOLLOWING } from '../../follows/graphql/follows.operations';
import { GET_STORE_PRODUCTS_BY_USER } from '../../store/graphql/store.operations';
import { GET_JOB_OFFERS_BY_USER, GET_PROFESSIONAL_PROFILES_BY_USER } from '../../jobs/graphql/jobs.operations';
import CreatePostModal from '../../feed/components/CreatePostModal';
import PostOptionsModal from '../../feed/components/PostOptionsModal';
import PostCard from '../../feed/components/PostCard';
import StoreProductCard from '../../store/components/StoreProductCard';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
import CommentsModal from '../../comments/components/CommentsModal';
import ListFooter from '../../../components/ListFooter';
import ProfileStats from '../components/ProfileStats';
import ProfileActions from '../components/ProfileActions';
import ProfileBio from '../components/ProfileBio';
import BanUserModal from '../../moderation/components/BanUserModal';
import { GET_OR_CREATE_CHAT } from '../../chat/graphql/chat.operations';

// ─────────────────────────────────────────────────────────────────────────────
// ProfileHeader — Componente memoizado separado del screen principal.
// CRÍTICO: Esto previene el bucle infinito de layout effects causado por pasar
// una función `renderHeader` con nueva referencia en cada render al FlatList.
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileHeaderProps {
    userData: any;
    isMyProfile: boolean;
    isFollowing: boolean;
    activeTab: 'all' | 'store' | 'jobs';
    colors: ThemeColors;
    currentUserRole?: string;
    onToggleFollow: () => void;
    onMessage: () => void;
    onEditProfile: () => void;
    onOpenMenu: () => void;
    onGoBack: () => void;
    onTabChange: (tab: 'all' | 'store' | 'jobs') => void;
    onOpenContextMenu: () => void;
}

const ProfileHeader = memo(({
    userData,
    isMyProfile,
    isFollowing,
    activeTab,
    colors,
    currentUserRole,
    onToggleFollow,
    onMessage,
    onEditProfile,
    onOpenMenu,
    onGoBack,
    onTabChange,
    onOpenContextMenu,
}: ProfileHeaderProps) => {
    const headerStyles = useMemo(() => getStyles(colors, false), [colors]);

    return (
        <>
            {/* Banner */}
            <View style={headerStyles.bannerContainer}>
                {userData?.coverUrl ? (
                    <Image source={{ uri: userData.coverUrl }} style={[headerStyles.bannerGradient, { position: 'absolute' }]} />
                ) : (
                    <LinearGradient
                        colors={[colors.primary, '#FF9800']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={headerStyles.bannerGradient}
                    />
                )}
                <View style={[headerStyles.floatingHeader, !isMyProfile && { justifyContent: 'space-between' }]}>
                    {isMyProfile ? (
                        <>
                            <TouchableOpacity onPress={onEditProfile} style={[headerStyles.floatingMenuButton, { marginRight: 10 }]}>
                                <Ionicons name="pencil" size={20} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onOpenMenu} style={headerStyles.floatingMenuButton}>
                                <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={onGoBack} style={headerStyles.floatingMenuButton}>
                                <Ionicons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                            {/* Menú contextual para perfiles ajenos */}
                            <TouchableOpacity onPress={onOpenContextMenu} style={headerStyles.floatingMenuButton}>
                                <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* Info del usuario */}
            <View style={headerStyles.content}>
                <View style={headerStyles.avatarCenterContainer}>
                    <View style={headerStyles.avatarWrapper}>
                        {userData?.photoUrl ? (
                            <Image source={{ uri: userData.photoUrl }} style={headerStyles.avatarImage} />
                        ) : (
                            <View style={headerStyles.avatarPlaceholder}>
                                <Text style={headerStyles.avatarPlaceholderText}>
                                    {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <Text style={headerStyles.fullName}>{userData?.firstName} {userData?.lastName}</Text>
                <Text style={headerStyles.username}>@{userData?.username}</Text>
                {userData?.badge?.title && (
                    <View style={headerStyles.badgeContainer}>
                        <Text style={headerStyles.badgeText}>{userData.badge.title}</Text>
                    </View>
                )}
                <ProfileStats
                    followersCount={userData?.followersCount || 0}
                    followingCount={userData?.followingCount || 0}
                    postsCount={userData?.posts?.length || 0}
                />
                {!isMyProfile && (
                    <ProfileActions
                        isFollowing={isFollowing}
                        onToggleFollow={onToggleFollow}
                        onMessage={onMessage}
                    />
                )}
                <ProfileBio bio={userData?.bio} phone={userData?.phone} customFields={userData?.customFields} />
            </View>

            {/* Tab Bar */}
            <View style={headerStyles.tabBar}>
                <TouchableOpacity
                    style={[headerStyles.tabItem, activeTab === 'all' && headerStyles.tabItemActive]}
                    onPress={() => onTabChange('all')}
                >
                    <Ionicons name="grid-outline" size={20} color={activeTab === 'all' ? colors.primary : colors.textSecondary} />
                    <Text style={[headerStyles.tabLabel, { color: activeTab === 'all' ? colors.primary : colors.textSecondary }]}>
                        Todo
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[headerStyles.tabItem, activeTab === 'store' && headerStyles.tabItemActive]}
                    onPress={() => onTabChange('store')}
                >
                    <Ionicons name="storefront-outline" size={20} color={activeTab === 'store' ? colors.primary : colors.textSecondary} />
                    <Text style={[headerStyles.tabLabel, { color: activeTab === 'store' ? colors.primary : colors.textSecondary }]}>
                        Tienda
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[headerStyles.tabItem, activeTab === 'jobs' && headerStyles.tabItemActive]}
                    onPress={() => onTabChange('jobs')}
                >
                    <Ionicons name="briefcase-outline" size={20} color={activeTab === 'jobs' ? colors.primary : colors.textSecondary} />
                    <Text style={[headerStyles.tabLabel, { color: activeTab === 'jobs' ? colors.primary : colors.textSecondary }]}>
                        Empleos
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// ProfileScreen — Screen principal
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileScreenProps {
    userId?: string;
}

const PROFILE_PAGE_SIZE = 5;

export default function ProfileScreen({ userId: propsUserId }: ProfileScreenProps) {
    const { signOut } = useAuth();
    const navigation = useNavigation();
    const { colors, themeMode, setThemeMode, isDark } = useTheme();
    const authContext = useAuth() as any;
    const currentUserId = authContext.user?.id;

    const [activeTab, setActiveTab] = useState<'all' | 'store' | 'jobs'>('all');
    const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
    const [isCreatePostVisible, setIsCreatePostVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
    const [editingPostContent, setEditingPostContent] = useState<string>('');
    const [editingPostTitle, setEditingPostTitle] = useState<string>('');
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<{
        post: any;
        minimize: boolean;
        initialTab?: 'comments' | 'likes';
    } | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // ── Menú contextual (perfil ajeno) ────────────────────────────────────────
    const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [isBanModalVisible, setIsBanModalVisible] = useState(false);
    const [reportReason, setReportReason] = useState('');
    // Estado del reporte previo (null = nunca reportado, PENDING = pendiente, RESOLVED/DISMISSED = puede reportar de nuevo)
    const [myReportStatus, setMyReportStatus] = useState<string | null>(null);

    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const route = useRoute<any>();
    const profileUserId = propsUserId || route.params?.userId || currentUserId;
    const isMyProfile = profileUserId === currentUserId;

    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: gqlData, loading: gqlLoading, error: gqlError, refetch: refetchProfile, fetchMore } = useQuery<any>(GET_USER_PROFILE, {
        variables: { id: profileUserId, limit: PROFILE_PAGE_SIZE, offset: 0 },
        skip: !profileUserId,
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
    });

    const { data: storeData, refetch: refetchStore } = useQuery<any>(GET_STORE_PRODUCTS_BY_USER, {
        variables: { userId: profileUserId },
        skip: !profileUserId,
        fetchPolicy: 'cache-and-network',
    });

    const { data: jobOffersData, refetch: refetchJobOffers } = useQuery<any>(GET_JOB_OFFERS_BY_USER, {
        variables: { userId: profileUserId },
        skip: !profileUserId,
        fetchPolicy: 'cache-and-network',
    });

    const { data: profsData, refetch: refetchProfs } = useQuery<any>(GET_PROFESSIONAL_PROFILES_BY_USER, {
        variables: { userId: profileUserId },
        skip: !profileUserId,
        fetchPolicy: 'cache-and-network',
    });

    const { data: followData } = useQuery<any>(IS_FOLLOWING, {
        variables: { followingId: profileUserId },
        skip: !profileUserId || isMyProfile,
        fetchPolicy: 'cache-and-network',
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const [toggleFollow] = useMutation<any>(TOGGLE_FOLLOW, {
        variables: { followingId: profileUserId },
        update(cache, { data: { toggleFollow: newValue } }) {
            cache.writeQuery({
                query: IS_FOLLOWING,
                variables: { followingId: profileUserId },
                data: { isFollowing: newValue },
            });
            cache.modify({
                id: cache.identify({ __typename: 'User', id: profileUserId }),
                fields: {
                    followersCount(existingCount = 0) {
                        return newValue ? existingCount + 1 : Math.max(0, existingCount - 1);
                    }
                }
            });
            if (currentUserId) {
                cache.modify({
                    id: cache.identify({ __typename: 'User', id: currentUserId }),
                    fields: {
                        followingCount(existingCount = 0) {
                            return newValue ? existingCount + 1 : Math.max(0, existingCount - 1);
                        }
                    }
                });
            }
        },
    });

    const [deletePost] = useMutation(DELETE_POST, {
        refetchQueries: [{ query: GET_POSTS }],
    });

    const [createReport, { loading: reporting }] = useMutation(CREATE_REPORT, {
        onCompleted: () => {
            setIsReportModalVisible(false);
            setReportReason('');
            setMyReportStatus('PENDING');
            // El Toast se muestra DESPUÉS de cerrar el modal para que sea visible
            setTimeout(() => {
                Toast.show({ type: 'success', text1: 'Denuncia enviada', text2: 'Gracias por ayudarnos a mantener la comunidad segura.' });
            }, 400);
        },
        onError: (err) => {
            const msg = err.message || '';
            if (msg.includes('ALREADY_REPORTED')) {
                setIsReportModalVisible(false);
                setReportReason('');
                setTimeout(() => {
                    Toast.show({ type: 'info', text1: 'Ya enviaste una denuncia', text2: 'Tu reporte anterior sigue en revisión.' });
                }, 400);
            } else {
                Toast.show({ type: 'error', text1: 'Error al reportar', text2: err.message });
            }
        },
    });

    const [fetchMyReportStatus] = useLazyQuery(GET_MY_REPORT_STATUS, {
        fetchPolicy: 'network-only',
        onCompleted: (data: any) => {
            setMyReportStatus(data?.getMyReportStatus?.status ?? null);
        },
    });

    // Al abrir el modal de reporte, verificar si ya hay un reporte activo
    const handleOpenReportModal = useCallback(() => {
        setIsContextMenuVisible(false);
        setTimeout(() => {
            if (profileUserId) {
                fetchMyReportStatus({ variables: { reportedItemId: profileUserId } });
            }
            setIsReportModalVisible(true);
        }, 250);
    }, [profileUserId, fetchMyReportStatus]);

    const [getOrCreateChat] = useMutation<any>(GET_OR_CREATE_CHAT);

    // ── Datos derivados ───────────────────────────────────────────────────────
    const userData = gqlData?.getUserProfile || null;
    const isFollowing = followData?.isFollowing || false;
    const storeProducts = storeData?.storeProductsByUser || [];

    const jobOffers = useMemo(
        () => (jobOffersData?.jobOffersByUser || []).map((j: any) => ({ ...j, __itemType: 'job', __typename: j.__typename || 'JobOffer' })),
        [jobOffersData]
    );
    const professionalProfiles = useMemo(
        () => (profsData?.professionalProfilesByUser || []).map((p: any) => ({ ...p, __itemType: 'professional', __typename: p.__typename || 'ProfessionalProfile' })),
        [profsData]
    );
    const jobsTabData = useMemo(
        () => [...jobOffers, ...professionalProfiles].sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        [jobOffers, professionalProfiles]
    );

    // Tab "Todo": posts + productos de tienda + empleos, ordenados por fecha
    const allTabData = useMemo(() => {
        const posts = (userData?.posts || []).map((p: any) => ({ ...p, __itemType: 'post', __typename: p.__typename || 'Post', author: userData }));
        const store = storeProducts.map((p: any) => ({ ...p, __itemType: 'store', __typename: p.__typename || 'StoreProduct' }));
        const jobs = [...jobOffers, ...professionalProfiles];
        return [...posts, ...store, ...jobs].sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [userData, storeProducts, jobOffers, professionalProfiles]);

    // Reset hasMore when switching profiles
    useEffect(() => {
        setHasMore(true);
    }, [profileUserId]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setHasMore(true);
        try {
            await Promise.all([
                refetchProfile({ id: profileUserId, limit: PROFILE_PAGE_SIZE, offset: 0 }),
                refetchStore(),
                refetchJobOffers(),
                refetchProfs(),
            ]);
        } catch (error) {
            console.error('Error refreshing profile:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refetchProfile, refetchStore, refetchJobOffers, refetchProfs, profileUserId]);

    const loadMorePosts = useCallback(() => {
        const currentPosts = gqlData?.getUserProfile?.posts;
        if (isFetchingMore || !hasMore || !currentPosts) return;

        setIsFetchingMore(true);
        fetchMore({
            variables: { id: profileUserId, limit: PROFILE_PAGE_SIZE, offset: currentPosts.length },
            updateQuery: (prev: any, { fetchMoreResult }: any) => {
                if (!fetchMoreResult) return prev;
                const newPosts = fetchMoreResult.getUserProfile?.posts || [];
                const prevPosts = prev.getUserProfile?.posts || [];
                if (newPosts.length === 0) return prev;
                const uniqueNew = newPosts.filter((n: any) => !prevPosts.find((p: any) => p.id === n.id));
                return {
                    getUserProfile: {
                        ...prev.getUserProfile,
                        posts: [...prevPosts, ...uniqueNew],
                    },
                };
            },
        })
        .then((res: any) => {
            const fetched = res?.data?.getUserProfile?.posts || [];
            if (fetched.length < PROFILE_PAGE_SIZE) setHasMore(false);
        })
        .finally(() => setIsFetchingMore(false));
    }, [isFetchingMore, hasMore, gqlData, profileUserId, fetchMore]);

    const handleMessagePress = useCallback(async () => {
        if (!profileUserId) return;
        try {
            const { data } = await getOrCreateChat({ variables: { targetUserId: profileUserId } });
            const conversationId = data.getOrCreateOneOnOneChat.id;
            (navigation as any).navigate('ChatRoom', { conversationId });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el chat' });
        }
    }, [profileUserId, getOrCreateChat, navigation]);

    const handleEditProfile = useCallback(() => {
        navigation.navigate('EditProfile' as never);
    }, [navigation]);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleOpenMenu = useCallback(() => setIsMenuVisible(true), []);
    const handleCloseMenu = useCallback(() => setIsMenuVisible(false), []);
    const handleOpenContextMenu = useCallback(() => setIsContextMenuVisible(true), []);
    const handleCloseContextMenu = useCallback(() => setIsContextMenuVisible(false), []);

    const handleSendReport = useCallback(() => {
        if (!reportReason.trim()) {
            Toast.show({ type: 'info', text1: 'El motivo es obligatorio' });
            return;
        }
        createReport({
            variables: {
                reportedItemId: profileUserId,
                reportedItemType: 'USER',
                reason: reportReason.trim(),
            },
        });
    }, [reportReason, profileUserId, createReport]);

    // ── FlatList config ───────────────────────────────────────────────────────
    // onViewableItemsChanged DEBE ser una ref estable — no puede cambiar entre renders
    const onViewableItemsChangedRef = useRef(({ viewableItems }: any) => {
        setVisiblePostId(viewableItems.length > 0 ? viewableItems[0].item.id : null);
    });
    const onViewableItemsChanged = onViewableItemsChangedRef.current;

    // viewabilityConfig DEBE ser una ref estable, nunca recreada ni condicional
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 200,
    }).current;

    // ListHeaderComponent DEBE ser una función estable, nunca JSX inline
    // Si se pasa JSX inline, FlatList crea un nuevo elemento en cada render → bucle infinito
    const renderListHeader = useCallback(() => (
        <ProfileHeader
            userData={userData}
            isMyProfile={isMyProfile}
            isFollowing={isFollowing}
            activeTab={activeTab}
            colors={colors}
            currentUserRole={authContext.user?.role}
            onToggleFollow={toggleFollow}
            onMessage={handleMessagePress}
            onEditProfile={handleEditProfile}
            onOpenMenu={handleOpenMenu}
            onGoBack={handleGoBack}
            onTabChange={setActiveTab}
            onOpenContextMenu={handleOpenContextMenu}
        />
    ), [userData, isMyProfile, isFollowing, activeTab, colors, toggleFollow, handleMessagePress, handleEditProfile, handleOpenMenu, handleGoBack, handleOpenContextMenu]);

    // Determinar qué datos para cada tab
    // IMPORTANTE: siempre marcar __itemType para que renderItem sepa qué componente usar
    const tabData = useMemo(() => {
        if (activeTab === 'store') return storeProducts.map((p: any) => ({ ...p, __itemType: 'store', __typename: p.__typename || 'StoreProduct' }));
        if (activeTab === 'jobs') return jobsTabData;
        return allTabData;
    }, [activeTab, storeProducts, jobsTabData, allTabData]);

    // ── Memoized data for CommentsModal ───────────────────────────────────────
    const commentsModalData = useMemo(() => {
        if (!selectedPostForComments) return { post: null, nextPost: null, prevPost: null };
        
        const currentIndex = tabData.findIndex((p: any) => p.id === selectedPostForComments.post?.id);
        const livePost = currentIndex !== -1 ? tabData[currentIndex] : selectedPostForComments.post;

        let nextPost = null;
        if (currentIndex !== -1 && currentIndex < tabData.length - 1) {
            nextPost = { ...tabData[currentIndex + 1] };
            if (!nextPost.author) nextPost.author = userData;
        } else if (hasMore && activeTab === 'all') {
            nextPost = {} as any;
        }

        let prevPost = null;
        if (currentIndex > 0) {
            prevPost = { ...tabData[currentIndex - 1] };
            if (!prevPost.author) prevPost.author = userData;
        }

        const postWithAuthor = livePost?.author ? livePost : { ...livePost, author: userData };

        return {
            post: postWithAuthor,
            nextPost,
            prevPost,
        };
    }, [selectedPostForComments, userData, hasMore, tabData, activeTab]);

    // ── Render items ──────────────────────────────────────────────────────────
    const renderItem = useCallback(({ item }: any) => {
        const type = item.__itemType;

        const openInModal = (isPost = false) => {
            // Aseguramos que el item que llega al modal tenga un author si le falta
            // En el perfil, si le falta el author, seguramente es el usuario dueño del perfil.
            const itemWithAuthor = item.author ? item : { ...item, author: userData };
            setSelectedPostForComments({ 
                post: itemWithAuthor, 
                minimize: !isPost, 
                initialTab: 'comments' 
            });
        };

        if (type === 'store') {
            return <StoreProductCard 
                item={item} 
                onPress={() => openInModal(false)} 
                onCommentPress={() => openInModal(true)}
            />;
        }
        if (type === 'job') {
            return <JobOfferCard item={item} onPress={() => openInModal(false)} />;
        }
        if (type === 'professional') {
            return <ProfessionalCard item={item} onPress={() => openInModal(false)} />;
        }
        if (type === 'post') {
            // item ya viene con author inyectado desde allTabData
            return (
                <PostCard
                    item={item}
                    currentUserId={currentUserId}
                    onOptionsPress={(p: any) => {
                        setSelectedPost(p);
                        setIsOptionsMenuVisible(true);
                    }}
                    onOpenComments={(_, initialTab, minimize) =>
                        setSelectedPostForComments({ post: item, minimize: !!minimize, initialTab })
                    }
                    isViewable={item.id === visiblePostId}
                    isFocused={isFocused}
                    isOverlayActive={!!selectedPostForComments || isCreatePostVisible}
                    isModalView={false}
                />
            );
        }
        // Fallback seguro: no renderizar nada si el tipo es desconocido
        return null;
    }, [currentUserId, visiblePostId, isFocused, selectedPostForComments, isCreatePostVisible, userData]);

    const keyExtractor = useCallback((item: any) => {
        const type = item.__itemType;
        if (type === 'store') return `store-${item.id}`;
        if (type === 'job') return `job-${item.id}`;
        if (type === 'professional') return `prof-${item.id}`;
        return `post-${item.id}`;
    }, []);

    // ── Empty states ──────────────────────────────────────────────────────────
    const emptyIcon = activeTab === 'store' ? 'storefront-outline' : activeTab === 'jobs' ? 'briefcase-outline' : 'grid-outline';
    const emptyTitle = activeTab === 'store' ? 'Sin productos en tienda' : activeTab === 'jobs' ? 'Sin publicaciones de empleo' : 'Sin publicaciones aún';
    const emptySub = activeTab === 'store'
        ? 'Los productos publicados en la tienda aparecerán aquí.'
        : activeTab === 'jobs'
            ? 'Las ofertas de empleo y servicios aparecerán aquí.'
            : 'Cuando compartas algo, aparecerá aquí.';

    // ── Early returns (SIEMPRE después de todos los hooks) ────────────────────
    if (gqlLoading && !gqlData) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!userData && !gqlLoading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <Text style={styles.errorText}>
                    {gqlError ? 'Error al cargar el perfil' : 'No se encontró el perfil'}
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <FlatList
                data={tabData}
                extraData={visiblePostId}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={
                    <View style={styles.emptyPostsContainer}>
                        <Ionicons name={emptyIcon} size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyPostsText}>{emptyTitle}</Text>
                        <Text style={styles.emptyPostsSubText}>{emptySub}</Text>
                    </View>
                }
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                }
                onEndReached={activeTab === 'all' ? loadMorePosts : undefined}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                    activeTab === 'all' && isFetchingMore ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
                    ) : (activeTab === 'all' && !hasMore && (userData?.posts?.length ?? 0) > 0) || (activeTab !== 'all' && tabData.length > 0) ? (
                        <ListFooter />
                    ) : null
                }
            />

            {/* Menú lateral de configuración */}
            <Modal visible={isMenuVisible} animationType="fade" transparent onRequestClose={handleCloseMenu}>
                <TouchableWithoutFeedback onPress={handleCloseMenu}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalContent, { paddingTop: Math.max(insets.top, 20) + 10, paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
                                <View style={styles.drawerHeader}>
                                    <TouchableOpacity onPress={handleCloseMenu} style={styles.drawerCloseBtn}>
                                        <Ionicons name="close" size={28} color={colors.text} />
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Configuración</Text>
                                    <View style={{ width: 28 }} />
                                </View>
                                {['ADMIN', 'MODERATOR'].includes(authContext.user?.role) && (
                                    <TouchableOpacity
                                        style={styles.settingButton}
                                        onPress={() => { handleCloseMenu(); setTimeout(() => (navigation as any).navigate('Moderation'), 300); }}
                                    >
                                        <View style={styles.settingLeft}>
                                            <View style={{ backgroundColor: 'rgba(255,101,36,0.12)', borderRadius: 10, padding: 4, marginRight: 4 }}>
                                                <Ionicons name="shield-checkmark-outline" size={22} color="#FF6524" />
                                            </View>
                                            <Text style={[styles.settingText, { color: '#FF6524' }]}>Moderación</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#FF6524" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.settingButton}
                                    onPress={() => { handleCloseMenu(); setTimeout(() => setIsThemeModalVisible(true), 300); }}
                                >
                                    <View style={styles.settingLeft}>
                                        <Ionicons name="color-palette-outline" size={24} color={colors.text} />
                                        <Text style={styles.settingText}>Tema</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <View style={styles.spacer} />
                                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
                                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
                                </TouchableOpacity>
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

            <CreatePostModal
                visible={isCreatePostVisible}
                onClose={() => { setIsCreatePostVisible(false); refetchProfile(); }}
                postId={editingPostId}
                initialContent={editingPostContent}
                initialTitle={editingPostTitle}
            />

            <PostOptionsModal
                visible={isOptionsMenuVisible}
                onClose={() => setIsOptionsMenuVisible(false)}
                onEdit={() => {
                    if (selectedPost) {
                        setEditingPostId(selectedPost.id);
                        setEditingPostContent(selectedPost.content);
                        setEditingPostTitle(selectedPost.title || '');
                        setIsCreatePostVisible(true);
                    }
                }}
                onDelete={() => {
                    if (selectedPost) deletePost({ variables: { id: selectedPost.id } });
                }}
            />

            {/* ─── Menú contextual para perfil ajeno ─── */}
            <Modal visible={isContextMenuVisible} animationType="fade" transparent onRequestClose={handleCloseContextMenu}>
                <TouchableWithoutFeedback onPress={handleCloseContextMenu}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.contextMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.contextMenuTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                    @{userData?.username}
                                </Text>

                                {/* Reportar — disponible para todos */}
                                <TouchableOpacity
                                    style={styles.contextMenuItem}
                                    onPress={handleOpenReportModal}
                                >
                                    <View style={[styles.contextMenuIcon, { backgroundColor: 'rgba(244,67,54,0.1)' }]}>
                                        <Ionicons name="flag-outline" size={20} color="#F44336" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.contextMenuItemText, { color: colors.text }]}>Reportar usuario</Text>
                                        <Text style={[styles.contextMenuItemSub, { color: colors.textSecondary }]}>Notificar a moderación</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {/* Banear — solo ADMIN y MODERATOR */}
                                {['ADMIN', 'MODERATOR'].includes(authContext.user?.role) && (
                                    <TouchableOpacity
                                        style={styles.contextMenuItem}
                                        onPress={() => { handleCloseContextMenu(); setTimeout(() => setIsBanModalVisible(true), 250); }}
                                    >
                                        <View style={[styles.contextMenuIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                                            <Ionicons name="ban-outline" size={20} color="#EF4444" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.contextMenuItemText, { color: '#EF4444' }]}>Suspender usuario</Text>
                                            <Text style={[styles.contextMenuItemSub, { color: colors.textSecondary }]}>Aplicar sanción temporal o permanente</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ─── Modal de Reporte ─── */}
            {/* Usamos transparent + fondo manual para que el Toast quede por encima */}
            <Modal
                visible={isReportModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => { setIsReportModalVisible(false); setReportReason(''); }}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
                    <SafeAreaView style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', maxHeight: '90%' }} edges={['bottom']}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                            <View style={[styles.reportHeader, { borderBottomColor: colors.border }]}>
                                <TouchableOpacity onPress={() => { setIsReportModalVisible(false); setReportReason(''); }}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={[styles.reportTitle, { color: colors.text }]}>Reportar a @{userData?.username}</Text>
                                <View style={{ width: 24 }} />
                            </View>

                            <View style={{ padding: 20 }}>
                                {/* Tarjeta del usuario */}
                                <View style={[styles.reportUserCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={[styles.reportAvatar, { backgroundColor: colors.surface }]}>
                                        {userData?.photoUrl
                                            ? <Image source={{ uri: userData.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                            : <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '700' }}>{userData?.firstName?.[0]}{userData?.lastName?.[0]}</Text>
                                        }
                                    </View>
                                    <View>
                                        <Text style={[styles.reportUserName, { color: colors.text }]}>{userData?.firstName} {userData?.lastName}</Text>
                                        <Text style={[styles.reportUsername, { color: colors.textSecondary }]}>@{userData?.username}</Text>
                                    </View>
                                </View>

                                {/* Estado: ya reportado y pendiente */}
                                {myReportStatus === 'PENDING' ? (
                                    <View style={[styles.alreadyReportedBox, { backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)' }]}>
                                        <Ionicons name="time-outline" size={28} color="#F59E0B" style={{ marginBottom: 10 }} />
                                        <Text style={[styles.alreadyReportedTitle, { color: colors.text }]}>Denuncia en revisión</Text>
                                        <Text style={[styles.alreadyReportedSub, { color: colors.textSecondary }]}>
                                            Ya enviaste una denuncia sobre este usuario. Nuestro equipo de moderación está revisando el reporte.{`\n\n`}Si el usuario vuelve a cometer una infracción tras resolverse el reporte, podrás denunciarlo de nuevo.
                                        </Text>
                                    </View>
                                ) : (
                                    /* Formulario de reporte */
                                    <>
                                        <Text style={[styles.reportLabel, { color: colors.text }]}>¿Por qué estás reportando este perfil?</Text>
                                        <View style={[styles.reportInputBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                                            {['Contenido inapropiado', 'Acoso o bullying', 'Spam o publicidad', 'Información falsa', 'Otro motivo'].map((opt) => (
                                                <TouchableOpacity
                                                    key={opt}
                                                    style={[styles.reportOption, { borderColor: colors.border }, reportReason === opt && { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
                                                    onPress={() => setReportReason(opt)}
                                                >
                                                    <View style={[styles.reportRadio, { borderColor: reportReason === opt ? colors.primary : colors.border }]}>
                                                        {reportReason === opt && <View style={[styles.reportRadioDot, { backgroundColor: colors.primary }]} />}
                                                    </View>
                                                    <Text style={[styles.reportOptionText, { color: reportReason === opt ? colors.primary : colors.text }]}>{opt}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Footer — solo visible cuando puede reportar */}
                            {myReportStatus !== 'PENDING' && (
                                <View style={[styles.reportFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
                                    <TouchableOpacity
                                        style={[styles.reportSendBtn, { backgroundColor: '#F44336', opacity: !reportReason.trim() || reporting ? 0.5 : 1 }]}
                                        onPress={handleSendReport}
                                        disabled={!reportReason.trim() || reporting}
                                    >
                                        {reporting
                                            ? <ActivityIndicator color="#FFF" size="small" />
                                            : <><Ionicons name="flag" size={16} color="#FFF" style={{ marginRight: 8 }} /><Text style={styles.reportSendText}>Enviar denuncia</Text></>
                                        }
                                    </TouchableOpacity>
                                </View>
                            )}
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                </View>
            </Modal>


            {/* ─── Modal de Baneo ─── */}
            <BanUserModal
                visible={isBanModalVisible}
                onClose={() => setIsBanModalVisible(false)}
                targetUser={userData ? { id: userData.id, firstName: userData.firstName, lastName: userData.lastName, username: userData.username } : null}
                onSuccess={() => refetchProfile()}
            />


            <CommentsModal
                visible={!!selectedPostForComments}
                post={commentsModalData.post}
                nextPost={commentsModalData.nextPost}
                hasMorePosts={hasMore}
                prevPost={commentsModalData.prevPost}
                onClose={() => setSelectedPostForComments(null)}
                initialMinimized={selectedPostForComments?.minimize}
                initialTab={selectedPostForComments?.initialTab}
                onNextPost={() => {
                    const currentIndex = tabData.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex !== -1) {
                        if (activeTab === 'all' && currentIndex >= tabData.length - 3 && hasMore && !isFetchingMore) {
                            loadMorePosts();
                        }
                        if (currentIndex < tabData.length - 1) {
                            const nextItem = tabData[currentIndex + 1];
                            setSelectedPostForComments({
                                post: nextItem.author ? nextItem : { ...nextItem, author: userData },
                                minimize: !!selectedPostForComments?.minimize,
                                initialTab: selectedPostForComments?.initialTab,
                            });
                        } else if (hasMore && activeTab === 'all') {
                            Toast.show({ type: 'info', text1: 'Cargando más...', text2: 'Desliza de nuevo en un momento.' });
                            if (!isFetchingMore) loadMorePosts();
                        }
                    }
                }}
                onPrevPost={() => {
                    const currentIndex = tabData.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex > 0) {
                        const prevItem = tabData[currentIndex - 1];
                        setSelectedPostForComments({
                            post: prevItem.author ? prevItem : { ...prevItem, author: userData },
                            minimize: !!selectedPostForComments?.minimize,
                            initialTab: selectedPostForComments?.initialTab,
                        });
                    }
                }}
                onOptionsPress={(post) => {
                    setSelectedPost(post);
                    setIsOptionsMenuVisible(true);
                }}
            />
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    bannerContainer: { width: '100%', height: 240, position: 'relative' },
    bannerGradient: { ...StyleSheet.absoluteFillObject },
    floatingHeader: {
        flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 10,
        position: 'absolute', top: 0, left: 0, right: 0,
    },
    floatingMenuButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    content: { paddingTop: 0 },
    avatarCenterContainer: { alignItems: 'center', marginTop: -48, marginBottom: 12 },
    avatarWrapper: { borderRadius: 50, padding: 4, backgroundColor: colors.background },
    avatarImage: { width: 96, height: 96, borderRadius: 48 },
    avatarPlaceholder: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    avatarPlaceholderText: { color: colors.textSecondary, fontSize: 38, fontWeight: '500', textTransform: 'uppercase' },
    fullName: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 2, textAlign: 'center' },
    username: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, textAlign: 'center' },
    badgeContainer: {
        alignSelf: 'center', paddingVertical: 3, paddingHorizontal: 10,
        backgroundColor: colors.surface, borderRadius: 4, borderWidth: 1, borderColor: colors.border, marginBottom: 12,
    },
    badgeText: { color: colors.text, fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
        marginTop: 8, backgroundColor: colors.surface,
    },
    tabItem: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12,
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabItemActive: { borderBottomColor: colors.primary },
    tabLabel: { fontSize: 13, fontWeight: '600' },
    emptyPostsContainer: {
        alignItems: 'center', justifyContent: 'center', paddingVertical: 40,
        backgroundColor: colors.surface, borderRadius: 16,
        borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', marginHorizontal: 16,
    },
    emptyPostsText: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16, marginBottom: 8 },
    emptyPostsSubText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
    spacer: { flex: 1 },
    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 16,
        backgroundColor: isDark ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 82, 82, 0.05)',
        marginBottom: 20, marginTop: 10,
    },
    logoutText: { color: colors.error, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    errorText: { color: colors.textSecondary, fontSize: 16 },
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
    // ─── Menú contextual (perfil ajeno) ───────────────────────────────────────
    contextMenu: {
        position: 'absolute',
        top: 60,
        right: 16,
        width: 260,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 16,
    },
    contextMenuTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 4,
    },
    contextMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    contextMenuIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contextMenuItemText: {
        fontSize: 14,
        fontWeight: '700',
    },
    contextMenuItemSub: {
        fontSize: 11,
        marginTop: 1,
    },
    // ─── Modal de reporte ─────────────────────────────────────────────────────
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    reportUserCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 20,
    },
    reportAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    reportUserName: {
        fontSize: 15,
        fontWeight: '700',
    },
    reportUsername: {
        fontSize: 13,
        marginTop: 2,
    },
    reportLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
    },
    reportInputBox: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    reportOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderBottomWidth: 1,
    },
    reportRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportRadioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    reportOptionText: {
        fontSize: 14,
        fontWeight: '500',
    },
    reportFooter: {
        padding: 16,
        borderTopWidth: 1,
    },
    reportSendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
    },
    reportSendText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    // Panel de "ya reportado"
    alreadyReportedBox: {
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        marginTop: 4,
    },
    alreadyReportedTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    alreadyReportedSub: {
        fontSize: 13.5,
        lineHeight: 20,
        textAlign: 'center',
    },
});
