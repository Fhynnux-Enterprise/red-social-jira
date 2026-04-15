import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useApolloClient } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_ALL_REPORTS, RESOLVE_REPORT, DISMISS_REPORT, GET_POST_BY_ID, GET_STORE_PRODUCT_BY_ID, GET_JOB_OFFER_BY_ID, GET_COMMENT_BY_ID, GET_STORE_PRODUCT_COMMENT_BY_ID, GET_PROFESSIONAL_PROFILE_BY_ID } from '../graphql/moderation.operations';
import PostCard from '../../feed/components/PostCard';
import StoreProductCard from '../../store/components/StoreProductCard';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
import CommentsModal from '../../comments/components/CommentsModal';

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
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
    POST: 'newspaper-outline',
    JOB_OFFER: 'briefcase-outline',
    SERVICE: 'construct-outline',
    PRODUCT: 'storefront-outline',
    COMMENT: 'chatbubble-outline',
};

export default function ModerationScreen() {
    const { colors, isDark } = useTheme();
    const client = useApolloClient();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [fetchedItem, setFetchedItem] = useState<any>(null);
    const [fullPostVisible, setFullPostVisible] = useState(false);
    const [fullProductVisible, setFullProductVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<null | { type: 'resolve' | 'resolve_delete' | 'dismiss' }>(null);
    const [confirmNote, setConfirmNote] = useState('');

    const { data, loading, refetch } = useQuery(GET_ALL_REPORTS, {
        variables: { limit: 50, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

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
            refetch();
            Toast.show({ type: 'info', text1: 'Denuncia descartada', text2: 'No se tomó acción sobre este contenido.' });
        },
        onError: (err) => {
            console.error('[Moderation] dismissReport error:', err.message);
            Alert.alert('Error', err.message || 'No se pudo descartar la denuncia.');
        },
    });

    const reports: any[] = data?.getAllReports || [];

    const [getPost] = useLazyQuery(GET_POST_BY_ID);
    const [getProduct] = useLazyQuery(GET_STORE_PRODUCT_BY_ID);
    const [getJob] = useLazyQuery(GET_JOB_OFFER_BY_ID);
    const [getService] = useLazyQuery(GET_PROFESSIONAL_PROFILE_BY_ID);
    const [getComment] = useLazyQuery(GET_COMMENT_BY_ID);
    const [getStoreComment] = useLazyQuery(GET_STORE_PRODUCT_COMMENT_BY_ID);
    const [fetchingItem, setFetchingItem] = useState(false);

    const handleReportPress = async (item: any) => {
        setSelectedReport(item);
        setFetchedItem(null);
        setFetchingItem(true);
        setPreviewVisible(true);

        console.log('[Moderation] handleReportPress:', item.reportedItemType, item.reportedItemId);

        try {
            let res;
            if (item.reportedItemType === 'POST') {
                res = await getPost({ variables: { id: item.reportedItemId } });
                console.log('[Moderation] POST result:', res.data?.getPostById);
                setFetchedItem(res.data?.getPostById);
            } else if (item.reportedItemType === 'PRODUCT') {
                res = await getProduct({ variables: { id: item.reportedItemId } });
                console.log('[Moderation] PRODUCT result:', res.data?.getStoreProductById);
                setFetchedItem(res.data?.getStoreProductById);
            } else if (item.reportedItemType === 'JOB_OFFER') {
                res = await getJob({ variables: { id: item.reportedItemId } });
                console.log('[Moderation] JOB result:', res.data?.getJobOfferById);
                setFetchedItem(res.data?.getJobOfferById);
            } else if (item.reportedItemType === 'SERVICE') {
                res = await getService({ variables: { id: item.reportedItemId } });
                console.log('[Moderation] SERVICE result:', res.data?.getProfessionalProfileById);
                setFetchedItem(res.data?.getProfessionalProfileById);
            } else if (item.reportedItemType === 'COMMENT') {
                // Consultamos ambos sistemas en paralelo y usamos el que devuelve datos
                const [postCommentResult, storeCommentResult] = await Promise.allSettled([
                    getComment({ variables: { id: item.reportedItemId } }),
                    getStoreComment({ variables: { id: item.reportedItemId } }),
                ]);

                console.log('[Moderation] postCommentResult:', postCommentResult);
                console.log('[Moderation] storeCommentResult:', storeCommentResult);

                const postComment = postCommentResult.status === 'fulfilled'
                    ? postCommentResult.value.data?.getCommentById
                    : null;
                const storeComment = storeCommentResult.status === 'fulfilled'
                    ? storeCommentResult.value.data?.getStoreProductCommentById
                    : null;

                console.log('[Moderation] postComment:', postComment, '| storeComment:', storeComment);
                setFetchedItem(postComment || storeComment || null);
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
        console.log(`[Moderation] Executing action: ${pendingAction.type} on report ${reportId} (item: ${reportedItemType} ${reportedItemId})`);

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

            {loading && reports.length === 0 ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    renderItem={renderReport}
                    contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} colors={[colors.primary]} tintColor={colors.primary} />}
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
                        </ScrollView>
                    )}

                    {/* Acciones de Moderación o Estado */}
                    {selectedReport?.status === 'PENDING' ? (
                        <View style={[styles.previewActionFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                            <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: 10 }]}>Tomar Acción</Text>
                            
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
});
