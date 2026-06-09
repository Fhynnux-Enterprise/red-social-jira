import * as React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Platform,
    Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_POST_BY_ID } from '../graphql/posts.operations';
import { GET_STORE_PRODUCT_BY_ID } from '../../store/graphql/store.operations';
import { GET_JOB_OFFER_BY_ID, GET_PROFESSIONAL_PROFILE_BY_ID, RESOLVE_APPEAL, GET_COMMENT_BY_ID, GET_STORE_PRODUCT_COMMENT_BY_ID } from '../../moderation/graphql/moderation.operations';
import { GET_ME } from '../../profile/graphql/profile.operations';
import PostCard from '../components/PostCard';
import StoreProductCard from '../../store/components/StoreProductCard';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
import CommentsModal from '../../comments/components/CommentsModal';
import PostOptionsModal from '../components/PostOptionsModal';
import ReportModal from '../../reports/components/ReportModal';
import { TOGGLE_SAVE_POST } from '../graphql/posts.operations';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams } from 'expo-router';
import AppealModal from '../../notifications/components/AppealModal';

export default function PostDetailScreen() {
    const route = useRoute<any>();
    const localParams = useLocalSearchParams();
    const navigation = useNavigation<any>();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { user: authUser } = useAuth() as any;
    const { data: meData } = useQuery<any>(GET_ME, {
        fetchPolicy: 'cache-first',
    });
    const currentUser = meData?.me || authUser;
    const alertColor = isDark ? '#FF453A' : '#FF3B30';

    const postId = (route.params?.postId || localParams?.postId) as string;
    const isStore = localParams.isStore === 'true' || route.params?.isStore === true;
    const itemType = (localParams?.itemType || route.params?.itemType) as string | undefined;
    const isDeletedContentParam = (localParams?.isDeletedContent || route.params?.isDeletedContent) === 'true';
    const moderatorNote = (localParams?.moderatorNote || route.params?.moderatorNote) as string | undefined;
    const appealId = (localParams?.appealId || route.params?.appealId) as string | undefined;

    const [selectedPostForComments, setSelectedPostForComments] = React.useState<any>(null);
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = React.useState(false);
    const [selectedPost, setSelectedPost] = React.useState<any>(null);
    const [isReportModalVisible, setIsReportModalVisible] = React.useState(false);
    const [isAppealModalVisible, setIsAppealModalVisible] = React.useState(false);

    const isModeratorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

    const [resolveAppeal, { loading: resolvingAppeal }] = useMutation(RESOLVE_APPEAL);

    const handleResolveAppeal = async (approve: boolean) => {
        if (!appealId) return;
        try {
            await resolveAppeal({
                variables: {
                    input: {
                        appealId,
                        approve
                    }
                },
                refetchQueries: ['GetPendingAppeals']
            });
            Toast.show({
                type: 'success',
                text1: approve 
                    ? (itemType === 'COMMENT_DETAIL' ? 'Comentario restaurado' : 'Publicación restaurada') 
                    : 'Apelación rechazada',
                text2: approve ? 'El contenido está visible nuevamente.' : 'La decisión original se mantiene.',
            });
            navigation.goBack();
        } catch (err: any) {
            console.error('Error resolving appeal in detail:', err);
            Toast.show({
                type: 'error',
                text1: 'Error al procesar la apelación',
                text2: err.message || 'Inténtalo de nuevo más tarde.',
            });
        }
    };

    let queryToUse = GET_POST_BY_ID;
    if (itemType === 'COMMENT_DETAIL') {
        queryToUse = isStore ? GET_STORE_PRODUCT_COMMENT_BY_ID : GET_COMMENT_BY_ID;
    } else if (itemType === 'STORE_DETAIL' || (itemType !== 'COMMENT_DETAIL' && isStore)) {
        queryToUse = GET_STORE_PRODUCT_BY_ID;
    } else if (itemType === 'JOB_DETAIL') {
        queryToUse = GET_JOB_OFFER_BY_ID;
    } else if (itemType === 'SERVICE_DETAIL') {
        queryToUse = GET_PROFESSIONAL_PROFILE_BY_ID;
    }

    // Query single post / product detail
    const { data, loading, error, refetch } = useQuery<any>(queryToUse, {
        variables: { id: postId },
        skip: !postId,
        fetchPolicy: 'cache-and-network',
    });

    const [toggleSavePost] = useMutation(TOGGLE_SAVE_POST);

    const handleToggleSave = async (post: any) => {
        if (!post) return;
        let typeToUse = 'POST';
        if (itemType === 'STORE_DETAIL' || isStore) {
            typeToUse = 'STORE_PRODUCT';
        } else if (itemType === 'JOB_DETAIL') {
            typeToUse = 'JOB_OFFER';
        } else if (itemType === 'SERVICE_DETAIL') {
            typeToUse = 'PROFESSIONAL_PROFILE';
        } else {
            typeToUse = post.__typename === 'StoreProduct' ? 'STORE_PRODUCT' : 
                        post.__typename === 'JobOffer' ? 'JOB_OFFER' :
                        post.__typename === 'ProfessionalProfile' ? 'PROFESSIONAL_PROFILE' : 'POST';
        }

        try {
            await toggleSavePost({
                variables: { postId: post.id, itemType: typeToUse },
                refetchQueries: ['GetSavedPosts'],
            });
            Toast.show({
                type: 'success',
                text1: post.isSaved ? 'Eliminado de guardados' : 'Guardado con éxito',
                position: 'bottom',
            });
            refetch();
        } catch (err) {
            console.error('Error toggling save:', err);
            Toast.show({
                type: 'error',
                text1: 'Error al actualizar guardados',
                position: 'bottom',
            });
        }
    };

    const handleOptionsPress = (post: any) => {
        setSelectedPost(post);
        setIsOptionsMenuVisible(true);
    };

    let post = null;
    if (itemType === 'COMMENT_DETAIL') {
        post = isStore ? data?.getStoreProductCommentById : data?.getCommentById;
    } else if (itemType === 'STORE_DETAIL' || (itemType !== 'COMMENT_DETAIL' && isStore)) {
        post = data?.getStoreProductById;
    } else if (itemType === 'JOB_DETAIL') {
        post = data?.getJobOfferById;
    } else if (itemType === 'SERVICE_DETAIL') {
        post = data?.getProfessionalProfileById;
    } else {
        post = data?.getPostById;
    }

    const isDeletedContent = isDeletedContentParam && !!post?.deletedAt;

    if (loading && !post) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error || !post) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: 20 }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
                <Ionicons name="alert-circle-outline" size={60} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                <Text style={[styles.errorText, { color: colors.text }]}>
                    {error ? 'Error al cargar la publicación' : 'Publicación no encontrada'}
                </Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={() => (postId ? refetch() : navigation.goBack())}
                >
                    <Text style={styles.retryButtonText}>{error ? 'Reintentar' : 'Volver atrás'}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Map fields dynamically based on item type
    const mappedPost = post ? (
        itemType === 'COMMENT_DETAIL'
        ? {
            ...post,
            __typename: isStore ? 'StoreProductComment' : 'Comment',
          }
        : (itemType === 'STORE_DETAIL' || (itemType !== 'COMMENT_DETAIL' && isStore))
        ? {
            ...post,
            __typename: 'StoreProduct',
            title: post.storeTitle ?? post.title,
            media: post.storeMedia ?? post.media ?? [],
            location: post.storeLocation ?? post.location,
            contactPhone: post.storeContactPhone ?? post.contactPhone,
          }
        : itemType === 'JOB_DETAIL'
        ? {
            ...post,
            __typename: 'JobOffer',
            title: post.title,
            media: post.media ?? [],
          }
        : itemType === 'SERVICE_DETAIL'
        ? {
            ...post,
            __typename: 'ProfessionalProfile',
            profession: post.profession,
            media: post.media ?? [],
          }
        : {
            ...post,
            __typename: 'Post',
            title: post.postTitle ?? post.title,
            media: post.postMedia ?? post.media ?? []
          }
    ) : null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                    Publicación
                </Text>
                <View style={styles.headerRightSpacer} />
            </View>

            {/* Warning Banner for Deleted Content */}
            {isDeletedContent && (
                isModeratorOrAdmin ? (
                    <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(251, 191, 36, 0.1)', borderColor: '#F59E0B' }]}>
                        <View style={styles.warningHeader}>
                            <Ionicons name="scale-outline" size={24} color="#F59E0B" style={{ marginRight: 8 }} />
                            <Text style={[styles.warningTitle, { color: '#F59E0B' }]}>Revisión de Apelación</Text>
                        </View>
                        <Text style={[styles.warningDescription, { color: colors.text, marginBottom: 8 }]}>
                            {itemType === 'COMMENT_DETAIL' 
                                ? 'Este comentario ha sido eliminado por un moderador.' 
                                : 'Esta publicación ha sido eliminada por un moderador.'}
                        </Text>
                        {moderatorNote ? (
                            <Text style={[styles.warningNote, { color: colors.textSecondary, marginBottom: 12 }]}>
                                Nota de eliminación: <Text style={{ fontStyle: 'italic', fontWeight: '500' }}>"{moderatorNote}"</Text>
                            </Text>
                        ) : null}
                        
                        {appealId ? (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                <TouchableOpacity
                                    style={[styles.appealActionBtn, { borderColor: '#EF4444', borderWidth: 1 }]}
                                    onPress={() => handleResolveAppeal(false)}
                                    disabled={resolvingAppeal}
                                >
                                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                                    {resolvingAppeal ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 14 }}>Rechazar apelación</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.appealActionBtn, { backgroundColor: '#22C55E' }]}
                                    onPress={() => handleResolveAppeal(true)}
                                    disabled={resolvingAppeal}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                    {resolvingAppeal ? <ActivityIndicator size="small" color="#FFF" /> : (
                                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                                            {itemType === 'COMMENT_DETAIL' ? 'Habilitar comentario' : 'Habilitar publicación'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={[styles.warningNote, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                                {itemType === 'COMMENT_DETAIL' 
                                    ? 'No hay apelación activa para este comentario.' 
                                    : 'No hay apelación activa para esta publicación.'}
                            </Text>
                        )}
                    </View>
                ) : (
                    <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 59, 48, 0.05)', borderColor: alertColor }]}>
                        <View style={styles.warningHeader}>
                            <Ionicons name="alert-circle" size={24} color={alertColor} style={{ marginRight: 8 }} />
                            <Text style={[styles.warningTitle, { color: alertColor }]}>
                                {itemType === 'COMMENT_DETAIL' ? 'Tu comentario ha sido eliminado' : 'Tu contenido ha sido eliminado'}
                            </Text>
                        </View>
                        <Text style={[styles.warningDescription, { color: colors.text, marginBottom: 8 }]}>
                            {itemType === 'COMMENT_DETAIL' 
                                ? 'Tu comentario ha sido eliminado por un moderador debido a reportes de la comunidad.' 
                                : 'Tu contenido ha sido eliminado por un moderador debido a reportes de la comunidad.'}
                        </Text>
                        {moderatorNote ? (
                            <Text style={[styles.warningNote, { color: colors.textSecondary, marginBottom: 12 }]}>
                                Nota del moderador: <Text style={{ fontStyle: 'italic', fontWeight: '500' }}>"{moderatorNote}"</Text>
                            </Text>
                        ) : null}
                        <TouchableOpacity
                            style={[styles.appealButton, { backgroundColor: alertColor }]}
                            onPress={() => setIsAppealModalVisible(true)}
                        >
                            <Ionicons name="shield-half-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.appealButtonText}>Apelar decisión</Text>
                        </TouchableOpacity>
                    </View>
                )
            )}

            {/* Scrollable Content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {itemType === 'COMMENT_DETAIL' ? (
                    <View style={[styles.commentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.commentHeader}>
                            {mappedPost?.user?.photoUrl ? (
                                <Image 
                                    source={{ uri: mappedPost.user.photoUrl }} 
                                    style={styles.commentAvatar} 
                                />
                            ) : (
                                <View style={[styles.commentAvatarPlaceholder, { backgroundColor: colors.border }]}>
                                    <Ionicons name="person" size={20} color={colors.textSecondary} />
                                </View>
                            )}
                            <View style={styles.commentAuthorMeta}>
                                <Text style={[styles.commentAuthorName, { color: colors.text }]}>
                                    {mappedPost?.user?.firstName} {mappedPost?.user?.lastName}
                                </Text>
                                <Text style={[styles.commentDate, { color: colors.textSecondary }]}>
                                    {mappedPost?.createdAt ? new Date(mappedPost.createdAt).toLocaleDateString() : ''}
                                </Text>
                            </View>
                        </View>
                        
                        <Text style={[styles.commentContentText, { color: colors.text }]}>
                            {mappedPost?.content}
                        </Text>

                        {mappedPost?.post && (
                            <View style={[styles.parentPostPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[styles.parentPostTitle, { color: colors.textSecondary }]}>
                                    Publicación original:
                                </Text>
                                <Text style={[styles.parentPostContent, { color: colors.text }]} numberOfLines={2}>
                                    {mappedPost.post.content}
                                </Text>
                            </View>
                        )}
                        {mappedPost?.product && (
                            <View style={[styles.parentPostPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[styles.parentPostTitle, { color: colors.textSecondary }]}>
                                    Producto original:
                                </Text>
                                <Text style={[styles.parentPostContent, { color: colors.text }]} numberOfLines={2}>
                                    {mappedPost.product.title}
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (itemType === 'STORE_DETAIL' || (itemType !== 'COMMENT_DETAIL' && isStore)) ? (
                    <StoreProductCard
                        item={mappedPost}
                        onPress={() => {}}
                        onCommentPress={() =>
                            setSelectedPostForComments({ post: mappedPost, minimize: false })
                        }
                        isViewable={true}
                        isFocused={true}
                    />
                ) : itemType === 'JOB_DETAIL' ? (
                    <JobOfferCard
                        item={mappedPost}
                        onPress={() => {}}
                        onOptionsPress={() => handleOptionsPress(mappedPost)}
                        onToggleSave={() => handleToggleSave(mappedPost)}
                        isSaved={mappedPost?.isSaved}
                        isViewable={true}
                        isFocused={true}
                    />
                ) : itemType === 'SERVICE_DETAIL' ? (
                    <ProfessionalCard
                        item={mappedPost}
                        onPress={() => {}}
                        onOptionsPress={() => handleOptionsPress(mappedPost)}
                        onToggleSave={() => handleToggleSave(mappedPost)}
                        isSaved={mappedPost?.isSaved}
                        isViewable={true}
                        isFocused={true}
                    />
                ) : (
                    <PostCard
                        item={mappedPost}
                        currentUserId={currentUser?.id}
                        onOptionsPress={handleOptionsPress}
                        onOpenComments={(_, initialTab, minimize, initialExpanded) =>
                            setSelectedPostForComments({ post: mappedPost, minimize: !!minimize, initialTab, initialExpanded })
                        }
                        onToggleSave={() => handleToggleSave(mappedPost)}
                        isSaved={mappedPost?.isSaved}
                        isViewable={true}
                        isFocused={true}
                    />
                )}
            </ScrollView>

            {/* CommentsModal */}
            {selectedPostForComments && (
                <CommentsModal
                    visible={!!selectedPostForComments}
                    post={mappedPost}
                    onClose={() => {
                        setSelectedPostForComments(null);
                    }}
                    onRefreshPost={refetch}
                    initialMinimized={selectedPostForComments.minimize}
                    initialTab={selectedPostForComments.initialTab}
                    initialExpanded={selectedPostForComments.initialExpanded}
                />
            )}

            {/* Post Options Modal */}
            <PostOptionsModal
                visible={isOptionsMenuVisible}
                onClose={() => setIsOptionsMenuVisible(false)}
                post={selectedPost}
                isOwner={
                    itemType === 'STORE_DETAIL' || isStore
                        ? selectedPost?.seller?.id === currentUser?.id
                        : itemType === 'JOB_DETAIL'
                        ? selectedPost?.author?.id === currentUser?.id
                        : itemType === 'SERVICE_DETAIL'
                        ? selectedPost?.user?.id === currentUser?.id
                        : selectedPost?.author?.id === currentUser?.id
                }
                onReport={() => {
                    setIsOptionsMenuVisible(false);
                    setIsReportModalVisible(true);
                }}
                onToggleSave={() => handleToggleSave(selectedPost)}
                isSaved={selectedPost?.isSaved}
                onEdit={() => {
                    setIsOptionsMenuVisible(false);
                    Toast.show({
                        type: 'info',
                        text1: 'Edición disponible en el inicio',
                        position: 'bottom',
                    });
                }}
                onDelete={() => {
                    setIsOptionsMenuVisible(false);
                    navigation.goBack();
                }}
            />

            {/* Report Modal */}
            <ReportModal
                visible={isReportModalVisible}
                onClose={() => setIsReportModalVisible(false)}
                reportedItemId={selectedPost?.id}
                reportedItemType={
                    itemType === 'STORE_DETAIL' || isStore
                        ? 'PRODUCT'
                        : itemType === 'JOB_DETAIL'
                        ? 'JOB_OFFER'
                        : itemType === 'SERVICE_DETAIL'
                        ? 'SERVICE'
                        : 'POST'
                }
            />

            {/* AppealModal */}
            <AppealModal
                visible={isAppealModalVisible}
                onClose={() => setIsAppealModalVisible(false)}
                referenceId={postId}
                appealType="CONTENT_DELETION"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: Platform.OS === 'ios' ? 44 : 56,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    headerRightSpacer: {
        width: 24,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningBanner: {
        padding: 16,
        margin: 16,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    warningNote: {
        fontSize: 13,
        lineHeight: 18,
    },
    appealButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 4,
    },
    appealButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    appealActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    commentContainer: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    commentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    commentAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentAuthorMeta: {
        flex: 1,
    },
    commentAuthorName: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    commentDate: {
        fontSize: 12,
        marginTop: 2,
    },
    commentContentText: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 16,
    },
    parentPostPreview: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 8,
    },
    parentPostTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    parentPostContent: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});
