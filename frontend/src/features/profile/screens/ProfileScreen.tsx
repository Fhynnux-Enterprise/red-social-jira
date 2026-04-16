import React, { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, RefreshControl, Platform, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useAuth } from '../../auth/context/AuthContext';
import ThemeSelectorModal from '../../../components/ThemeSelectorModal';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_USER_PROFILE } from '../graphql/profile.operations';
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
    onToggleFollow: () => void;
    onMessage: () => void;
    onEditProfile: () => void;
    onOpenMenu: () => void;
    onGoBack: () => void;
    onTabChange: (tab: 'all' | 'store' | 'jobs') => void;
}

const ProfileHeader = memo(({
    userData,
    isMyProfile,
    isFollowing,
    activeTab,
    colors,
    onToggleFollow,
    onMessage,
    onEditProfile,
    onOpenMenu,
    onGoBack,
    onTabChange,
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
                <View style={[headerStyles.floatingHeader, !isMyProfile && { justifyContent: 'flex-start' }]}>
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
                        <TouchableOpacity onPress={onGoBack} style={headerStyles.floatingMenuButton}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
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
            onToggleFollow={toggleFollow}
            onMessage={handleMessagePress}
            onEditProfile={handleEditProfile}
            onOpenMenu={handleOpenMenu}
            onGoBack={handleGoBack}
            onTabChange={setActiveTab}
        />
    ), [userData, isMyProfile, isFollowing, activeTab, colors, toggleFollow, handleMessagePress, handleEditProfile, handleOpenMenu, handleGoBack]);

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
});
