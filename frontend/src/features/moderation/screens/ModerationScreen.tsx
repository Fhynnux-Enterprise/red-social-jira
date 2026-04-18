import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert, Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useApolloClient } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_ALL_REPORTS, RESOLVE_REPORT, DISMISS_REPORT, GET_POST_BY_ID, GET_STORE_PRODUCT_BY_ID, GET_JOB_OFFER_BY_ID, GET_COMMENT_BY_ID, GET_STORE_PRODUCT_COMMENT_BY_ID, GET_PROFESSIONAL_PROFILE_BY_ID, UNBAN_USER, GET_BANNED_USERS, GET_USER_MINIMAL_PROFILE, GET_PENDING_APPEALS, RESOLVE_APPEAL } from '../graphql/moderation.operations';
import PostCard from '../../feed/components/PostCard';
import StoreProductCard from '../../store/components/StoreProductCard';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
import CommentsModal from '../../comments/components/CommentsModal';
import BanUserModal from '../components/BanUserModal';

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pendiente',
    RESOLVED: 'Resuelto',
    DISMISSED: 'Descartado',
};

const TYPE_LABEL: Record<string, string> = {
    POST: 'Publicación',
    JOB_OFFER: 'Oferta de Empleo',
    SERVICE: 'Servicio Profesional',
    PRODUCT: 'Producto de Tienda',
    COMMENT: 'Comentario',
    USER: 'Reporte a usuario',
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
    POST: 'newspaper-outline',
    JOB_OFFER: 'briefcase-outline',
    SERVICE: 'construct-outline',
    PRODUCT: 'storefront-outline',
    COMMENT: 'chatbubble-outline',
    USER: 'person-outline',
};

export default function ModerationScreen() {
    const { colors, isDark } = useTheme();
    const client = useApolloClient();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<'reports' | 'banned' | 'appeals'>('reports');
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [fetchedItem, setFetchedItem] = useState<any>(null);
    const [fullPostVisible, setFullPostVisible] = useState(false);
    const [fullProductVisible, setFullProductVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<null | { type: 'resolve' | 'resolve_delete' | 'dismiss' }>(null);
    const [confirmNote, setConfirmNote] = useState('');
    const [unbanTarget, setUnbanTarget] = useState<{ id: string; firstName: string; lastName: string; username: string; appealId?: string } | null>(null);
    const [banModalVisible, setBanModalVisible] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [bannedSearchTerm, setBannedSearchTerm] = useState('');

    const { data, loading, refetch, fetchMore } = useQuery(GET_ALL_REPORTS, {
        variables: { limit: 15, offset: 0, filter: statusFilter },
        fetchPolicy: 'cache-and-network',
        onCompleted: (res) => {
            if (res?.getAllReports?.length < 15) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        }
    });

    const handleLoadMore = () => {
        if (loadingMore || !hasMore || loading) return;
        setLoadingMore(true);
        fetchMore({
            variables: {
                offset: data?.getAllReports?.length || 0,
                filter: statusFilter,
            },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult || fetchMoreResult.getAllReports.length === 0) {
                    setHasMore(false);
                    return prev;
                }
                if (fetchMoreResult.getAllReports.length < 15) {
                    setHasMore(false);
                }
                // Avoid duplicates
                const newItems = fetchMoreResult.getAllReports.filter(
                    (newItem: any) => !prev.getAllReports.some((prevItem: any) => prevItem.id === newItem.id)
                );
                return {
                    getAllReports: [...prev.getAllReports, ...newItems],
                };
            },
        }).then(() => setLoadingMore(false)).catch(() => setLoadingMore(false));
    };

    const [resolveReport, { loading: resolving }] = useMutation(RESOLVE_REPORT, {
        onCompleted: () => {
            // Eliminar el item del Apollo cache para que el feed lo retire inmediatamente
            if (selectedReport) {
                const typename = selectedReport.reportedItemType === 'POST' ? 'Post'
                    : selectedReport.reportedItemType === 'PRODUCT' ? 'StoreProduct'
                    : selectedReport.reportedItemType === 'JOB_OFFER' ? 'JobOffer'
                    : selectedReport.reportedItemType === 'COMMENT' ? 'Comment'
                    : null;
                if (typename) {
                    client.cache.evict({ id: client.cache.identify({ __typename: typename, id: selectedReport.reportedItemId }) });
                    // Adicionalmente limpiamos el homólogo para los de la tienda
                    if (typename === 'Comment') {
                        client.cache.evict({ id: client.cache.identify({ __typename: 'StoreProductComment', id: selectedReport.reportedItemId }) });
                    }
                    client.cache.gc();
                }
            }
            setPreviewVisible(false);
            setPendingAction(null);
            setConfirmNote('');
            setSelectedReport(null);
            setHasMore(true);
            refetch();
            Toast.show({ type: 'success', text1: 'Denuncia resuelta', text2: 'El contenido ha sido moderado correctamente.' });
        },
        onError: (err) => {
            console.error('[Moderation] resolveReport error:', err.message);
            const isUnauth = err.message?.toLowerCase().includes('unauthorized')
                || err.graphQLErrors?.some((e: any) => e.extensions?.code === 'UNAUTHENTICATED');
            if (isUnauth) {
                Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Cierra sesión y vuelve a ingresar para continuar moderando.');
            } else {
                Alert.alert('Error al moderar', err.message || 'Ocurrió un error inesperado.');
            }
        },
    });

    const [dismissReport, { loading: dismissing }] = useMutation(DISMISS_REPORT, {
        onCompleted: () => {
            setPreviewVisible(false);
            setPendingAction(null);
            setConfirmNote('');
            setSelectedReport(null);
            setHasMore(true);
            refetch();
            Toast.show({ type: 'info', text1: 'Denuncia descartada', text2: 'No se tomó acción sobre este contenido.' });
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'No se pudo descartar la denuncia.');
        },
    });

    const reports: any[] = (data?.getAllReports || []).slice().sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // ── Query dedicada para usuarios baneados ──────────────────────────────────
    const [loadingBannedMore, setLoadingBannedMore] = useState(false);
    const [hasBannedMore, setHasBannedMore] = useState(true);

    const {
        data: bannedData,
        loading: bannedUsersLoading,
        refetch: refetchBanned,
        fetchMore: fetchMoreBanned,
    } = useQuery(GET_BANNED_USERS, {
        variables: { limit: 15, offset: 0, searchTerm: bannedSearchTerm },
        skip: activeTab !== 'banned',
        fetchPolicy: 'network-only',
        onCompleted: (res) => {
            if (res?.getBannedUsers?.length < 15) {
                setHasBannedMore(false);
            } else {
                setHasBannedMore(true);
            }
        }
    });

    const bannedUsers: any[] = bannedData?.getBannedUsers || [];

    const handleLoadMoreBanned = () => {
        if (loadingBannedMore || !hasBannedMore || bannedUsersLoading) return;
        setLoadingBannedMore(true);
        fetchMoreBanned({
            variables: {
                offset: bannedUsers.length,
                searchTerm: bannedSearchTerm,
            },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult || fetchMoreResult.getBannedUsers.length === 0) {
                    setHasBannedMore(false);
                    return prev;
                }
                if (fetchMoreResult.getBannedUsers.length < 15) {
                    setHasBannedMore(false);
                }
                // Evitar duplicados
                const newItems = fetchMoreResult.getBannedUsers.filter(
                    (newItem: any) => !prev.getBannedUsers.some((prevItem: any) => prevItem.id === newItem.id)
                );
                return {
                    getBannedUsers: [...prev.getBannedUsers, ...newItems],
                };
            },
        }).then(() => setLoadingBannedMore(false)).catch(() => setLoadingBannedMore(false));
    };

    const [unbanUser, { loading: unbanning }] = useMutation(UNBAN_USER, {
        onCompleted: (res) => {
            Toast.show({ type: 'success', text1: 'Suspensión levantada', text2: `${res.unbanUser.firstName} puede acceder nuevamente.` });
            refetchBanned();
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'No se pudo levantar la suspensión.');
        },
    });

    // ── Query para apelaciones pendientes ──────────────────────────────────────────
    const [loadingAppealsMore, setLoadingAppealsMore] = useState(false);
    const [hasAppealsMore, setHasAppealsMore] = useState(true);

    const {
        data: appealsData,
        loading: appealsLoading,
        refetch: refetchAppeals,
        fetchMore: fetchMoreAppeals,
    } = useQuery(GET_PENDING_APPEALS, {
        variables: { limit: 15, offset: 0 },
        skip: activeTab !== 'appeals',
        fetchPolicy: 'network-only',
        onCompleted: (res) => {
            if (res?.getPendingAppeals?.length < 15) {
                setHasAppealsMore(false);
            } else {
                setHasAppealsMore(true);
            }
        }
    });

    const pendingAppeals: any[] = appealsData?.getPendingAppeals || [];

    const handleLoadMoreAppeals = () => {
        if (loadingAppealsMore || !hasAppealsMore || appealsLoading) return;
        setLoadingAppealsMore(true);
        fetchMoreAppeals({
            variables: { offset: pendingAppeals.length },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult || fetchMoreResult.getPendingAppeals.length === 0) {
                    setHasAppealsMore(false);
                    return prev;
                }
                if (fetchMoreResult.getPendingAppeals.length < 15) {
                    setHasAppealsMore(false);
                }
                const newItems = fetchMoreResult.getPendingAppeals.filter(
                    (newItem: any) => !prev.getPendingAppeals.some((prevItem: any) => prevItem.id === newItem.id)
                );
                return {
                    getPendingAppeals: [...prev.getPendingAppeals, ...newItems],
                };
            },
        }).then(() => setLoadingAppealsMore(false)).catch(() => setLoadingAppealsMore(false));
    };

    const [resolveAppeal, { loading: resolvingAppeal }] = useMutation(RESOLVE_APPEAL, {
        onCompleted: (res) => {
            Toast.show({ type: 'success', text1: 'Apelación resuelta', text2: `La apelación ha sido ${res.resolveAppeal.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}.` });
            refetchAppeals();
            if (res.resolveAppeal.status === 'APPROVED') {
                refetchBanned();
            }
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'No se pudo resolver la apelación.');
        },
    });


    const [getPost] = useLazyQuery(GET_POST_BY_ID);
    const [getProduct] = useLazyQuery(GET_STORE_PRODUCT_BY_ID);
    const [getJob] = useLazyQuery(GET_JOB_OFFER_BY_ID);
    const [getService] = useLazyQuery(GET_PROFESSIONAL_PROFILE_BY_ID);
    const [getComment] = useLazyQuery(GET_COMMENT_BY_ID);
    const [getStoreComment] = useLazyQuery(GET_STORE_PRODUCT_COMMENT_BY_ID);
    const [getUser] = useLazyQuery(GET_USER_MINIMAL_PROFILE);
    const [fetchingItem, setFetchingItem] = useState(false);

    const handleReportPress = async (item: any) => {
        setSelectedReport(item);
        setFetchedItem(null);
        setFetchingItem(true);
        setPreviewVisible(true);
        setPreviewVisible(true);

        try {
            let res;
            if (item.reportedItemType === 'POST') {
                res = await getPost({ variables: { id: item.reportedItemId } });
                setFetchedItem(res.data?.getPostById);
            } else if (item.reportedItemType === 'PRODUCT') {
                res = await getProduct({ variables: { id: item.reportedItemId } });
                setFetchedItem(res.data?.getStoreProductById);
            } else if (item.reportedItemType === 'JOB_OFFER') {
                res = await getJob({ variables: { id: item.reportedItemId } });
                setFetchedItem(res.data?.getJobOfferById);
            } else if (item.reportedItemType === 'SERVICE') {
                res = await getService({ variables: { id: item.reportedItemId } });
                setFetchedItem(res.data?.getProfessionalProfileById);
            } else if (item.reportedItemType === 'COMMENT') {
                // Consultamos ambos sistemas en paralelo y usamos el que devuelve datos
                const [postCommentResult, storeCommentResult] = await Promise.allSettled([
                    getComment({ variables: { id: item.reportedItemId } }),
                    getStoreComment({ variables: { id: item.reportedItemId } }),
                ]);

                const postComment = postCommentResult.status === 'fulfilled'
                    ? postCommentResult.value.data?.getCommentById
                    : null;
                const storeComment = storeCommentResult.status === 'fulfilled'
                    ? storeCommentResult.value.data?.getStoreProductCommentById
                    : null;

                setFetchedItem(postComment || storeComment || null);
            } else if (item.reportedItemType === 'USER') {
                res = await getUser({ variables: { id: item.reportedItemId } });
                setFetchedItem(res.data?.getUserProfile);
            } else {
                // Si no hay endpoint para este tipo (ej: SERVICE)
                console.log('[Moderation] Unhandled type:', item.reportedItemType);
                setFetchedItem(null);
            }
        } catch (e) {
            console.log("Error al consultar publicación:", e);
        } finally {
            setFetchingItem(false);
        }
    };

    const executeConfirmedAction = () => {
        if (!pendingAction || !selectedReport) {
            console.warn('[Moderation] executeConfirmedAction: pendingAction or selectedReport is null', { pendingAction, selectedReport });
            return;
        }
        const note = confirmNote.trim() || undefined;
        const reportId = selectedReport.id;
        const reportedItemId = selectedReport.reportedItemId;
        const reportedItemType = selectedReport.reportedItemType;

        if (pendingAction.type === 'resolve') {
            resolveReport({ variables: { input: { reportId, deleteContent: false, moderatorNote: note } } });
        } else if (pendingAction.type === 'resolve_delete') {
            resolveReport({ variables: { input: { reportId, deleteContent: true, moderatorNote: note } } });
        } else if (pendingAction.type === 'dismiss') {
            dismissReport({ variables: { reportId, moderatorNote: note } });
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
        return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const renderReport = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => handleReportPress(item)}
        >
            {/* Type Banner */}
            <View style={[styles.typeBanner, { borderLeftColor: '#FF6524', backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.05)' }]}>
                <Ionicons name={TYPE_ICON[item.reportedItemType] || 'document-outline'} size={12} color="#FF6524" style={{ marginRight: 6 }} />
                <Text style={styles.typeBannerText}>{TYPE_LABEL[item.reportedItemType] || item.reportedItemType}</Text>
            </View>

            <View style={styles.cardBody}>
                {/* Reporter */}
                <View style={styles.reporterRow}>
                    <View style={[styles.reporterAvatar, { backgroundColor: 'rgba(244,67,54,0.12)' }]}>
                        <Text style={styles.reporterInitials}>
                            {item.reporter?.firstName?.[0]}{item.reporter?.lastName?.[0]}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.reporterName, { color: colors.text }]}>
                            {item.reporter?.firstName} {item.reporter?.lastName}
                            <Text style={{ color: colors.textSecondary, fontWeight: '400' }}> denunció</Text>
                        </Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
                    </View>
                    {item.status === 'PENDING' && (
                        <View style={[styles.pendingBadge, { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }]}>
                            <Text style={[styles.pendingText, { color: '#D97706', fontSize: 9, fontWeight: '800' }]}>PENDIENTE</Text>
                        </View>
                    )}
                    {item.status === 'RESOLVED' && (
                        <View style={[styles.pendingBadge, { backgroundColor: 'transparent' }]}>
                            <Text style={[
                                styles.pendingText,
                                item.contentDeleted ? { color: '#EF4444', borderColor: '#EF4444' } : { color: '#22C55E', borderColor: '#22C55E' }
                            ]}>
                                {item.contentDeleted ? 'ELIMINADA' : 'RESUELTA'}
                            </Text>
                        </View>
                    )}
                    {item.status === 'DISMISSED' && (
                        <View style={[styles.pendingBadge, { backgroundColor: 'transparent' }]}>
                            <Text style={[styles.pendingText, { color: colors.textSecondary, borderColor: colors.textSecondary }]}>DESCARTADA</Text>
                        </View>
                    )}
                </View>

                {/* Reason */}
                <View style={[styles.reasonBox, { backgroundColor: isDark ? 'rgba(244,67,54,0.08)' : 'rgba(244,67,54,0.04)', borderColor: isDark ? 'rgba(244,67,54,0.2)' : 'rgba(244,67,54,0.15)' }]}>
                    <Ionicons name="flag" size={14} color="#F44336" style={{ marginRight: 8 }} />
                    <Text style={[styles.reasonText, { color: isDark ? '#FF6B6B' : '#C62828' }]} numberOfLines={3}>
                        {item.reason}
                    </Text>
                </View>

                {/* Item ID */}
                <Text style={[styles.itemId, { color: colors.textSecondary }]}>
                    ID del contenido: {item.reportedItemId}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Panel de Moderación</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                        {reports.length} denuncia{reports.length !== 1 ? 's' : ''} en total
                    </Text>
                </View>
                <View style={[styles.shieldBadge, { backgroundColor: 'rgba(255,101,36,0.1)' }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#FF6524" />
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'reports' && styles.tabItemActive, activeTab === 'reports' && { borderBottomColor: '#FF6524' }]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Ionicons name="flag-outline" size={16} color={activeTab === 'reports' ? '#FF6524' : colors.textSecondary} />
                    <Text style={[styles.tabLabel, { color: activeTab === 'reports' ? '#FF6524' : colors.textSecondary }]}>Denuncias</Text>
                    {reports.filter((r: any) => r.status === 'PENDING').length > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>{reports.filter((r: any) => r.status === 'PENDING').length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'banned' && styles.tabItemActive, activeTab === 'banned' && { borderBottomColor: '#EF4444' }]}
                    onPress={() => setActiveTab('banned')}
                >
                    <Ionicons name="ban-outline" size={16} color={activeTab === 'banned' ? '#EF4444' : colors.textSecondary} />
                    <Text style={[styles.tabLabel, { color: activeTab === 'banned' ? '#EF4444' : colors.textSecondary }]}>Baneados</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'appeals' && styles.tabItemActive, activeTab === 'appeals' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('appeals')}
                >
                    <Ionicons name="scale-outline" size={16} color={activeTab === 'appeals' ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.tabLabel, { color: activeTab === 'appeals' ? colors.primary : colors.textSecondary }]}>Apelaciones</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'reports' && (
                <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {[
                            { label: 'Todas', value: null, icon: 'list-outline' },
                            { label: 'Pendientes', value: 'PENDING', icon: 'time-outline' },
                            { label: 'Resueltas', value: 'RESOLVED', icon: 'checkmark-circle-outline' },
                            { label: 'Eliminadas', value: 'DELETED', icon: 'trash-outline' },
                            { label: 'Descartadas', value: 'DISMISSED', icon: 'close-circle-outline' },
                        ].map((filter) => {
                            const isActive = statusFilter === filter.value;
                            return (
                                <TouchableOpacity
                                    key={filter.label}
                                    style={[
                                        styles.filterChip,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                                        isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => {
                                        setStatusFilter(filter.value);
                                        setHasMore(true);
                                    }}
                                >
                                    <Ionicons 
                                        name={filter.icon as any} 
                                        size={14} 
                                        color={isActive ? '#FFF' : colors.textSecondary} 
                                        style={{ marginRight: 6 }} 
                                    />
                                    <Text style={[styles.filterChipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {activeTab === 'banned' && (
                <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                        <Ionicons name="search" size={18} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Buscar por nombre o @username..."
                            placeholderTextColor={colors.textSecondary}
                            value={bannedSearchTerm}
                            onChangeText={(text) => {
                                setBannedSearchTerm(text);
                                setHasBannedMore(true);
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {bannedSearchTerm.length > 0 && (
                            <TouchableOpacity onPress={() => setBannedSearchTerm('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {loading && reports.length === 0 ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
            ) : activeTab === 'reports' ? (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    renderItem={renderReport}
                    contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setHasMore(true); refetch(); }} colors={[colors.primary]} tintColor={colors.primary} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-circle-outline" size={80} color={colors.textSecondary} style={{ opacity: 0.2, marginBottom: 16 }} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>¡Todo limpio!</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                No hay denuncias en el historial.
                            </Text>
                        </View>
                    }
                />
            ) : activeTab === 'banned' ? (
                // ── Tab de usuarios baneados ──────────────────────────────────────────────
                bannedUsersLoading ? (
                    <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 60 }} />
                ) : bannedUsers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons 
                            name={bannedSearchTerm ? "search-outline" : "shield-checkmark-outline"} 
                            size={80} 
                            color={colors.textSecondary} 
                            style={{ opacity: 0.2, marginBottom: 16 }} 
                        />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            {bannedSearchTerm ? 'Sin coincidencias' : 'Sin usuarios baneados'}
                        </Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                            {bannedSearchTerm 
                                ? `No se encontraron usuarios que coincidan con "${bannedSearchTerm}".`
                                : 'No hay usuarios con sanciones activas.'
                            }
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={bannedUsers}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
                        refreshControl={<RefreshControl refreshing={bannedUsersLoading} onRefresh={() => { setHasBannedMore(true); refetchBanned(); }} colors={['#EF4444']} tintColor="#EF4444" />}
                        onEndReached={handleLoadMoreBanned}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loadingBannedMore ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator size="small" color="#EF4444" />
                                </View>
                            ) : null
                        }
                        renderItem={({ item }) => {
                            const isPermanent = (() => {
                                const until = new Date(item.bannedUntil);
                                const now = new Date();
                                return (until.getTime() - now.getTime()) / 86400000 > 300;
                            })();
                            return (
                                <View style={[styles.bannedCard, { backgroundColor: colors.surface, borderColor: 'rgba(239,68,68,0.25)' }]}>
                                    <View style={styles.bannedCardTop}>
                                        <View style={[styles.bannedAvatar, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                                            {item.photoUrl
                                                ? <Image source={{ uri: item.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                                : <Text style={styles.bannedAvatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text>
                                            }
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.bannedName, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
                                            <Text style={[styles.bannedUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
                                        </View>
                                        <View style={[styles.bannedTypeBadge, { backgroundColor: isPermanent ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                                            <Ionicons name={isPermanent ? 'ban' : 'time-outline'} size={12} color={isPermanent ? '#EF4444' : '#F59E0B'} />
                                            <Text style={[styles.bannedTypeBadgeText, { color: isPermanent ? '#EF4444' : '#F59E0B' }]}>
                                                {isPermanent ? 'PERMANENTE' : 'TEMPORAL'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.bannedInfo, { backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.15)' }]}>
                                        <View style={styles.bannedInfoRow}>
                                            <Ionicons name="calendar-outline" size={13} color="#EF4444" />
                                            <Text style={styles.bannedInfoLabel}>Hasta:</Text>
                                            <Text style={styles.bannedInfoValue}>
                                                {isPermanent ? 'Indefinido' : new Date(item.bannedUntil).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View style={styles.bannedInfoRow}>
                                            <Ionicons name="document-text-outline" size={13} color="#EF4444" />
                                            <Text style={styles.bannedInfoLabel}>Motivo:</Text>
                                            <Text style={styles.bannedInfoValue} numberOfLines={2}>{item.banReason}</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.unbanBtn, unbanning && { opacity: 0.5 }]}
                                        onPress={() => setUnbanTarget({ id: item.id, firstName: item.firstName, lastName: item.lastName, username: item.username })}
                                        disabled={unbanning}
                                    >
                                        <Ionicons name="shield-checkmark-outline" size={16} color="#22C55E" style={{ marginRight: 6 }} />
                                        <Text style={styles.unbanBtnText}>Levantar suspensión</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                    />
                )
            ) : (
                // ── Tab de Apelaciones ──────────────────────────────────────────────
                appealsLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
                ) : pendingAppeals.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-circle-outline" size={80} color={colors.textSecondary} style={{ opacity: 0.2, marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin apelaciones</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>No hay apelaciones pendientes por revisar.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={pendingAppeals}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
                        refreshControl={<RefreshControl refreshing={appealsLoading} onRefresh={() => { setHasAppealsMore(true); refetchAppeals(); }} colors={[colors.primary]} tintColor={colors.primary} />}
                        onEndReached={handleLoadMoreAppeals}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loadingAppealsMore ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            ) : null
                        }
                        renderItem={({ item }) => (
                            <View style={[styles.bannedCard, { backgroundColor: colors.surface, borderColor: item.type === 'ACCOUNT_BAN' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)' }]}>
                                <View style={styles.bannedCardTop}>
                                    <View style={[styles.bannedAvatar, { backgroundColor: item.type === 'ACCOUNT_BAN' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                                        {item.user.photoUrl ? (
                                            <Image source={{ uri: item.user.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                        ) : (
                                            <Text style={styles.bannedAvatarText}>{item.user.firstName?.[0]}{item.user.lastName?.[0]}</Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.bannedName, { color: colors.text }]}>{item.user.firstName} {item.user.lastName}</Text>
                                        <Text style={[styles.bannedUsername, { color: colors.textSecondary }]}>@{item.user.username}</Text>
                                    </View>
                                    <View style={[styles.bannedTypeBadge, { backgroundColor: item.type === 'ACCOUNT_BAN' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                                        <Ionicons name={item.type === 'ACCOUNT_BAN' ? "ban" : "trash-outline"} size={12} color={item.type === 'ACCOUNT_BAN' ? '#EF4444' : '#F59E0B'} />
                                        <Text style={[styles.bannedTypeBadgeText, { color: item.type === 'ACCOUNT_BAN' ? '#EF4444' : '#F59E0B' }]}>
                                            {item.type === 'ACCOUNT_BAN' ? 'CUENTA BANEADA' : 'CONTENIDO'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.bannedInfo, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border, marginTop: 12 }]}>
                                    <View style={styles.bannedInfoRow}>
                                        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                                        <Text style={[styles.bannedInfoLabel, { color: colors.textSecondary }]}>Enviado el:</Text>
                                        <Text style={[styles.bannedInfoValue, { color: colors.text }]}>
                                            {new Date(item.createdAt).toLocaleDateString()} a las {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <View style={[styles.bannedInfoRow, { alignItems: 'flex-start' }]}>
                                        <Ionicons name="document-text-outline" size={13} color={colors.textSecondary} style={{ marginTop: 2 }} />
                                        <Text style={[styles.bannedInfoLabel, { color: colors.textSecondary }]}>Justificación:</Text>
                                        <Text style={[styles.bannedInfoValue, { color: colors.text, fontStyle: 'italic', flex: 1 }]} numberOfLines={4}>
                                            "{item.reason}"
                                        </Text>
                                    </View>
                                </View>
    
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                                    <TouchableOpacity
                                        style={[{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, { borderColor: colors.error, backgroundColor: 'transparent' }, resolvingAppeal && { opacity: 0.5 }]}
                                        disabled={resolvingAppeal}
                                        onPress={() => {
                                            Alert.alert('Rechazar apelación', 'La sanción se mantendrá intacta. ¿Confirmar?', [
                                                { text: 'Cancelar', style: 'cancel' },
                                                { text: 'Rechazar', style: 'destructive', onPress: () => resolveAppeal({ variables: { input: { appealId: item.id, approve: false } } }) }
                                            ]);
                                        }}
                                    >
                                        <Ionicons name="close-circle-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
                                        <Text style={[{ fontSize: 14, fontWeight: '600' }, { color: colors.error }]}>Rechazar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, { backgroundColor: '#22C55E' }, resolvingAppeal && { opacity: 0.5 }]}
                                        disabled={resolvingAppeal}
                                        onPress={() => {
                                            if (item.type === 'ACCOUNT_BAN') {
                                                // Abrir el mismo modal de confirmación que en la pestaña Baneados
                                                setUnbanTarget({
                                                    id: item.user.id,
                                                    firstName: item.user.firstName,
                                                    lastName: item.user.lastName,
                                                    username: item.user.username,
                                                    appealId: item.id,
                                                });
                                            } else {
                                                Alert.alert('Restaurar contenido', 'Esto restaurará el contenido eliminado. ¿Continuar?', [
                                                    { text: 'Cancelar', style: 'cancel' },
                                                    { text: 'Restaurar', onPress: () => resolveAppeal({ variables: { input: { appealId: item.id, approve: true } } }) }
                                                ]);
                                            }
                                        }}
                                    >
                                        <Ionicons name="shield-checkmark-outline" size={16} color="white" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                                            {item.type === 'ACCOUNT_BAN' ? 'Desbanear' : 'Restaurar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )
            )}

            {/* Preview Modal */}
            <Modal
                visible={previewVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setPreviewVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={styles.previewHeader}>
                        <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.previewTitle, { color: colors.text }]}>Contenido Denunciado</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {fetchingItem ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
                    ) : !fetchedItem ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="alert-circle-outline" size={60} color={colors.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Contenido no disponible</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                El contenido pudo haber sido eliminado por el usuario o no es previsualizable.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1, padding: 12 }} contentContainerStyle={{ paddingBottom: 280 }}>
                            {selectedReport?.reportedItemType === 'POST' && (
                                <>
                                    <PostCard item={fetchedItem} isModalView />
                                    {/* Botón Ver publicación y comentarios completos */}
                                    <TouchableOpacity
                                        onPress={() => setFullPostVisible(true)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: 12,
                                            marginBottom: 4,
                                            paddingVertical: 12,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: colors.primary,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                                        <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: '600', fontSize: 14 }}>Ver publicación y comentarios completos</Text>
                                        <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </>
                            )}
                            {selectedReport?.reportedItemType === 'PRODUCT' && (
                                <>
                                    <StoreProductCard item={fetchedItem} isModalView />
                                    <TouchableOpacity
                                        onPress={() => setFullProductVisible(true)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: 12,
                                            marginBottom: 4,
                                            paddingVertical: 12,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: colors.primary,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                                        <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: '600', fontSize: 14 }}>Ver producto y comentarios completos</Text>
                                        <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </>
                            )}
                            {selectedReport?.reportedItemType === 'JOB_OFFER' && (
                                <JobOfferCard item={fetchedItem} isModalView />
                            )}
                            {selectedReport?.reportedItemType === 'SERVICE' && (
                                <ProfessionalCard item={fetchedItem} isModalView />
                            )}
                            {selectedReport?.reportedItemType === 'COMMENT' && (
                                <View style={{ padding: 10 }}>
                                    {/* Bloque resaltado del comentario denunciado */}
                                    <View style={{ backgroundColor: isDark ? 'rgba(255,101,36,0.1)' : 'rgba(255,101,36,0.05)', padding: 15, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF6524', marginBottom: 20 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <Ionicons name="chatbubble-ellipses" size={15} color="#FF6524" />
                                            <Text style={{ color: '#FF6524', fontWeight: 'bold', marginLeft: 6, fontSize: 12, letterSpacing: 0.5 }}>COMENTARIO DENUNCIADO</Text>
                                        </View>
                                        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{fetchedItem.content}</Text>
                                        <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 12 }}>
                                            Por: <Text style={{ fontWeight: '600' }}>{fetchedItem.user?.firstName} {fetchedItem.user?.lastName}</Text>
                                        </Text>
                                    </View>

                                    {/* Publicación original resumida */}
                                    {(fetchedItem.post || fetchedItem.product) && (
                                        <>
                                            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5, marginLeft: 2 }}>PUBLICACIÓN ORIGINAL</Text>
                                            {fetchedItem.post ? (
                                                <PostCard item={fetchedItem.post} isModalView />
                                            ) : (
                                                <StoreProductCard item={fetchedItem.product} isModalView />
                                            )}

                                            {/* Botón Ver publicación/producto completo */}
                                            {fetchedItem.post && (
                                                <TouchableOpacity
                                                    onPress={() => setFullPostVisible(true)}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginTop: 12,
                                                        marginBottom: 4,
                                                        paddingVertical: 12,
                                                        borderRadius: 10,
                                                        borderWidth: 1,
                                                        borderColor: colors.primary,
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                    }}
                                                >
                                                    <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                                                    <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: '600', fontSize: 14 }}>Ver publicación y comentarios completos</Text>
                                                    <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                                                </TouchableOpacity>
                                            )}
                                            {fetchedItem.product && (
                                                <TouchableOpacity
                                                    onPress={() => setFullProductVisible(true)}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginTop: 12,
                                                        marginBottom: 4,
                                                        paddingVertical: 12,
                                                        borderRadius: 10,
                                                        borderWidth: 1,
                                                        borderColor: colors.primary,
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                    }}
                                                >
                                                    <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                                                    <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: '600', fontSize: 14 }}>Ver producto y comentarios completos</Text>
                                                    <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                                                </TouchableOpacity>
                                            )}
                                        </>
                                    )}
                                </View>
                            )}
                            {selectedReport?.reportedItemType === 'USER' && fetchedItem && (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,101,36,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden', borderWidth: 3, borderColor: '#FF6524' }}>
                                        {fetchedItem.photoUrl ? (
                                            <Image source={{ uri: fetchedItem.photoUrl }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <Ionicons name="person" size={50} color="#FF6524" />
                                        )}
                                    </View>
                                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text }}>{fetchedItem.firstName} {fetchedItem.lastName}</Text>
                                    <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 12 }}>@{fetchedItem.username}</Text>
                                    
                                    {fetchedItem.bio && (
                                        <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 15, borderRadius: 12 }}>
                                            <Text style={{ color: colors.text, textAlign: 'center', fontStyle: 'italic' }}>"{fetchedItem.bio}"</Text>
                                        </View>
                                    )}

                                    <View style={{ flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(255,101,36,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10 }}>
                                        <Ionicons name="shield-outline" size={14} color="#FF6524" style={{ marginRight: 6 }} />
                                        <Text style={{ color: '#FF6524', fontWeight: 'bold', fontSize: 12 }}>PERFIL DE USUARIO</Text>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setPreviewVisible(false);
                                            (navigation as any).navigate('Profile', { userId: fetchedItem.id });
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            marginTop: 15,
                                            paddingVertical: 14,
                                            borderRadius: 12,
                                            backgroundColor: colors.primary,
                                        }}
                                    >
                                        <Ionicons name="person-circle-outline" size={20} color="#FFF" />
                                        <Text style={{ color: '#FFF', marginLeft: 8, fontWeight: 'bold', fontSize: 16 }}>Ir al perfil completo</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    {/* Acciones de Moderación o Estado */}
                    {selectedReport?.status === 'PENDING' ? (
                        <View style={[styles.previewActionFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                            <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: 10 }]}>Tomar Acción</Text>
                            
                            {selectedReport?.reportedItemType === 'USER' ? (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: '#EF4444', backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)' }]}
                                    onPress={() => setBanModalVisible(true)}
                                    disabled={fetchingItem}
                                >
                                    <Ionicons name="ban" size={20} color="#EF4444" style={{ marginRight: 10 }} />
                                    <View>
                                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Suspender Usuario</Text>
                                        <Text style={{ color: '#EF4444', fontSize: 11, opacity: 0.8 }}>Aplicar baneo temporal o permanente</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { borderColor: '#388E3C', backgroundColor: isDark ? 'rgba(56,142,60,0.1)' : 'rgba(56,142,60,0.06)' }]}
                                        onPress={() => { setPendingAction({ type: 'resolve' }); setConfirmNote(''); }}
                                        disabled={fetchingItem}
                                    >
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#388E3C" style={{ marginRight: 10 }} />
                                        <View>
                                            <Text style={[styles.actionBtnText, { color: '#388E3C' }]}>Resolver</Text>
                                            <Text style={{ color: '#388E3C', fontSize: 11, opacity: 0.8 }}>Mantener contenido intacto</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { borderColor: '#F44336', backgroundColor: isDark ? 'rgba(244,67,54,0.1)' : 'rgba(244,67,54,0.06)' }]}
                                        onPress={() => { setPendingAction({ type: 'resolve_delete' }); setConfirmNote(''); }}
                                        disabled={fetchingItem}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#F44336" style={{ marginRight: 10 }} />
                                        <View>
                                            <Text style={[styles.actionBtnText, { color: '#F44336' }]}>Eliminar y Resolver</Text>
                                            <Text style={{ color: '#F44336', fontSize: 11, opacity: 0.8 }}>Soft-delete (el archivo se conserva en R2)</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            <TouchableOpacity
                                style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', marginBottom: 0 }]}
                                onPress={() => { setPendingAction({ type: 'dismiss' }); setConfirmNote(''); }}
                                disabled={fetchingItem}
                            >
                                <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                                <View>
                                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Descartar Denuncia</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, opacity: 0.8 }}>No hay infracción visible</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={[styles.previewActionFooter, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: 20 }]}>
                            <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: 5 }]}>
                                {selectedReport?.status === 'RESOLVED' 
                                    ? (selectedReport?.contentDeleted ? 'Contenido Eliminado' : 'Denuncia Resuelta') 
                                    : 'Denuncia Descartada'}
                            </Text>
                            <Text style={{ color: colors.textSecondary, marginTop: 5, fontSize: 14 }}>
                                <Text style={{ fontWeight: 'bold' }}>Nota del moderador:</Text> {selectedReport?.moderatorNote || 'No se añadió ninguna nota.'}
                            </Text>
                        </View>
                    )}
                </SafeAreaView>
            </Modal>

            {/* Diálogo de Confirmación con Nota */}
            <Modal
                visible={pendingAction !== null}
                transparent
                animationType="fade"
                onRequestClose={() => { if (!resolving && !dismissing) { setPendingAction(null); setConfirmNote(''); } }}
            >
                <KeyboardAvoidingView
                    style={styles.confirmBackdrop}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.confirmDialog, { backgroundColor: colors.surface }]}>
                        {/* Icon + Title */}
                        <View style={styles.confirmIconRow}>
                            <View style={[styles.confirmIconBg, {
                                backgroundColor: pendingAction?.type === 'dismiss'
                                    ? 'rgba(158,158,158,0.15)'
                                    : pendingAction?.type === 'resolve_delete'
                                        ? 'rgba(244,67,54,0.12)'
                                        : 'rgba(56,142,60,0.12)'
                            }]}>
                                <Ionicons
                                    name={
                                        pendingAction?.type === 'dismiss' ? 'close-circle'
                                        : pendingAction?.type === 'resolve_delete' ? 'trash'
                                        : 'checkmark-circle'
                                    }
                                    size={32}
                                    color={
                                        pendingAction?.type === 'dismiss' ? colors.textSecondary
                                        : pendingAction?.type === 'resolve_delete' ? '#F44336'
                                        : '#388E3C'
                                    }
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.confirmTitle, { color: colors.text }]}>
                                    {pendingAction?.type === 'dismiss' ? 'Descartar denuncia'
                                     : pendingAction?.type === 'resolve_delete' ? 'Eliminar y resolver'
                                     : 'Resolver denuncia'}
                                </Text>
                                <Text style={[styles.confirmSubtitle, { color: colors.textSecondary }]}>
                                    {pendingAction?.type === 'dismiss'
                                        ? 'La denuncia se cerrará sin tomar acción sobre el contenido.'
                                        : pendingAction?.type === 'resolve_delete'
                                            ? 'El contenido se ocultará a los usuarios. El archivo multimedia se conservará en almacenamiento.'
                                            : 'La denuncia se marcará como resuelta. El contenido permanece visible.'}
                                </Text>
                            </View>
                        </View>

                        {/* Campo de nota opcional */}
                        <Text style={[styles.noteLabel, { color: colors.text }]}>Nota del moderador (opcional)</Text>
                        <TextInput
                            style={[styles.noteInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: colors.text, borderColor: colors.border }]}
                            placeholder="Agrega un comentario sobre tu decisión..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                            value={confirmNote}
                            onChangeText={setConfirmNote}
                        />

                        {/* Botones */}
                        <View style={styles.confirmBtns}>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                                onPress={() => { setPendingAction(null); setConfirmNote(''); }}
                                disabled={resolving || dismissing}
                            >
                                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, {
                                    backgroundColor: pendingAction?.type === 'dismiss' ? colors.textSecondary
                                        : pendingAction?.type === 'resolve_delete' ? '#F44336'
                                        : '#388E3C'
                                }]}
                                onPress={executeConfirmedAction}
                                disabled={resolving || dismissing}
                            >
                                {(resolving || dismissing)
                                    ? <ActivityIndicator color="#FFF" />
                                    : <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Confirmar</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal de publicación completa con comentarios */}
            {fullPostVisible && (() => {
                // Para tipo POST: fetchedItem es el post directamente
                // Para tipo COMMENT: fetchedItem.post es el post padre
                const postForModal = selectedReport?.reportedItemType === 'POST'
                    ? fetchedItem
                    : fetchedItem?.post;
                return postForModal ? (
                    <CommentsModal
                        visible={fullPostVisible}
                        onClose={() => setFullPostVisible(false)}
                        post={postForModal}
                        initialTab="comments"
                    />
                ) : null;
            })()}
            {fullProductVisible && (() => {
                // Para tipo PRODUCT: fetchedItem es el producto directamente
                // Para tipo COMMENT: fetchedItem.product es el producto padre
                const productForModal = selectedReport?.reportedItemType === 'PRODUCT'
                    ? fetchedItem
                    : fetchedItem?.product;
                return productForModal ? (
                    <CommentsModal
                        visible={fullProductVisible}
                        onClose={() => setFullProductVisible(false)}
                        post={productForModal}
                        initialTab="comments"
                    />
                ) : null;
            })()}

            {/* ── Modal de confirmación de unban ─────────────────────────── */}
            <Modal
                visible={unbanTarget !== null}
                transparent
                animationType="fade"
                onRequestClose={() => { if (!unbanning) setUnbanTarget(null); }}
            >
                <View style={styles.confirmBackdrop}>
                    <View style={[styles.unbanDialog, { backgroundColor: colors.surface }]}>
                        {/* Icono */}
                        <View style={styles.unbanIconRow}>
                            <View style={styles.unbanIconBg}>
                                <Ionicons name="shield-checkmark" size={34} color="#22C55E" />
                            </View>
                        </View>

                        {/* Textos */}
                        <Text style={[styles.unbanDialogTitle, { color: colors.text }]}>
                            Levantar suspensión
                        </Text>
                        <Text style={[styles.unbanDialogSub, { color: colors.textSecondary }]}>
                            ¿Confirmas que deseas levantar la sanción de{' '}
                            <Text style={{ fontWeight: '800', color: colors.text }}>
                                {unbanTarget?.firstName} {unbanTarget?.lastName}
                            </Text>
                            {' '}(@{unbanTarget?.username})?
                        </Text>
                        <Text style={[styles.unbanDialogNote, { color: colors.textSecondary, backgroundColor: isDark ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }]}>
                            El usuario recuperará acceso inmediato a la plataforma.
                        </Text>

                        {/* Botones */}
                        <View style={styles.unbanActions}>
                            <TouchableOpacity
                                style={[styles.unbanCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => setUnbanTarget(null)}
                                disabled={unbanning}
                            >
                                <Text style={[styles.unbanCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.unbanConfirmBtn, (unbanning || resolvingAppeal) && { opacity: 0.6 }]}
                                onPress={() => {
                                    if (unbanTarget) {
                                        if (unbanTarget.appealId) {
                                            // Viene de la pestaña de Apelaciones → aprobar la apelación (el backend hace el unban)
                                            resolveAppeal({ variables: { input: { appealId: unbanTarget.appealId, approve: true } } });
                                        } else {
                                            // Viene de la pestaña de Baneados → unban directo
                                            unbanUser({ variables: { userId: unbanTarget.id } });
                                        }
                                        setUnbanTarget(null);
                                    }
                                }}
                                disabled={unbanning || resolvingAppeal}
                            >
                                {(unbanning || resolvingAppeal)
                                    ? <ActivityIndicator color="#FFF" size="small" />
                                    : <>
                                        <Ionicons name="shield-checkmark-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.unbanConfirmText}>Levantar sanción</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Ban Modal for Moderation Panel */}
            <BanUserModal
                visible={banModalVisible}
                onClose={() => setBanModalVisible(false)}
                targetUser={fetchedItem && selectedReport?.reportedItemType === 'USER' ? fetchedItem : null}
                onSuccess={() => {
                    setBanModalVisible(false);
                    setPreviewVisible(false);
                    setSelectedReport(null);
                    refetch();
                }}
            />
            
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '800' },
    headerSub: { fontSize: 12, marginTop: 1 },
    shieldBadge: {
        marginLeft: 'auto',
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
    },
    typeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderLeftWidth: 4,
    },
    typeBannerText: { color: '#FF6524', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    cardBody: { padding: 14 },
    reporterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    reporterAvatar: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    reporterInitials: { color: '#F44336', fontSize: 13, fontWeight: '700' },
    reporterName: { fontSize: 13, fontWeight: '700' },
    date: { fontSize: 11, marginTop: 2 },
    pendingBadge: {
        backgroundColor: 'rgba(255,152,0,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    pendingText: { color: '#E65100', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    reasonBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 10,
    },
    reasonText: { flex: 1, fontSize: 13, lineHeight: 18 },
    itemId: { fontSize: 10, fontFamily: 'monospace' },
    emptyContainer: {
        paddingVertical: 80,
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    // Modals
    previewHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)'
    },
    previewClose: { padding: 4 },
    previewTitle: { fontSize: 16, fontWeight: '700' },
    previewActionFooter: {
        padding: 16, borderTopWidth: 1,
        paddingBottom: 24
    },
    sheetTitle: { fontSize: 17, fontWeight: '800' },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, borderWidth: 1.5,
        paddingVertical: 10, paddingHorizontal: 14,
        marginBottom: 10,
    },
    actionBtnText: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    // Confirm dialog
    confirmBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmDialog: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
    },
    confirmIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
    confirmIconBg: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    confirmTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    confirmSubtitle: { fontSize: 12, lineHeight: 17 },
    noteLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    noteInput: {
        borderWidth: 1, borderRadius: 10,
        padding: 12, fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    confirmBtns: { flexDirection: 'row', gap: 10 },
    confirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
    confirmBtnText: { fontSize: 15, fontWeight: '700' },
    // ─── Tab bar ─────────────────────────────────────────────────────────────
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomWidth: 2,
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    tabBadge: {
        backgroundColor: '#EF4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    // ─── Tarjeta de usuario baneado ───────────────────────────────────────────
    bannedCard: {
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 12,
        padding: 14,
        gap: 12,
    },
    bannedCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bannedAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    bannedAvatarText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '700',
    },
    bannedName: {
        fontSize: 15,
        fontWeight: '700',
    },
    bannedUsername: {
        fontSize: 12,
        marginTop: 2,
    },
    bannedTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    bannedTypeBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    bannedInfo: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
        gap: 6,
    },
    bannedInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    bannedInfoLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
        minWidth: 50,
    },
    bannedInfoValue: {
        fontSize: 12,
        color: '#9CA3AF',
        flex: 1,
    },
    unbanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34,197,94,0.06)',
    },
    unbanBtnText: {
        color: '#22C55E',
        fontSize: 14,
        fontWeight: '700',
    },
    // ── Unban confirmation dialog ─────────────────────────────────────────────
    unbanDialog: {
        width: '100%',
        borderRadius: 22,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
        elevation: 18,
    },
    unbanIconRow: {
        alignItems: 'center',
        marginBottom: 18,
    },
    unbanIconBg: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(34,197,94,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unbanDialogTitle: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    unbanDialogSub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 14,
    },
    unbanDialogNote: {
        fontSize: 12.5,
        textAlign: 'center',
        lineHeight: 18,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 22,
    },
    unbanActions: {
        flexDirection: 'row',
        gap: 10,
    },
    unbanCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    unbanCancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
    unbanConfirmBtn: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#16A34A',
    },
    unbanConfirmText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
    // ─── Filtros ─────────────────────────────────────────────────────────────
    filterContainer: {
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    filterScroll: {
        paddingHorizontal: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    // ─── Buscador ────────────────────────────────────────────────────────────
    searchContainer: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        height: '100%',
    },
});
