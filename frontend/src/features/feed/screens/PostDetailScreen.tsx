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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_POST_BY_ID } from '../graphql/posts.operations';
import { GET_STORE_PRODUCT_BY_ID } from '../../store/graphql/store.operations';
import { GET_JOB_OFFER_BY_ID, GET_PROFESSIONAL_PROFILE_BY_ID } from '../../moderation/graphql/moderation.operations';
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

export default function PostDetailScreen() {
    const route = useRoute<any>();
    const localParams = useLocalSearchParams();
    const navigation = useNavigation<any>();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth() as any;

    const postId = (route.params?.postId || localParams?.postId) as string;
    const isStore = localParams.isStore === 'true' || route.params?.isStore === true;
    const itemType = (localParams?.itemType || route.params?.itemType) as string | undefined;

    const [selectedPostForComments, setSelectedPostForComments] = React.useState<any>(null);
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = React.useState(false);
    const [selectedPost, setSelectedPost] = React.useState<any>(null);
    const [isReportModalVisible, setIsReportModalVisible] = React.useState(false);

    let queryToUse = GET_POST_BY_ID;
    if (itemType === 'STORE_DETAIL' || isStore) {
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
    if (itemType === 'STORE_DETAIL' || isStore) {
        post = data?.getStoreProductById;
    } else if (itemType === 'JOB_DETAIL') {
        post = data?.getJobOfferById;
    } else if (itemType === 'SERVICE_DETAIL') {
        post = data?.getProfessionalProfileById;
    } else {
        post = data?.getPostById;
    }

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
        (itemType === 'STORE_DETAIL' || isStore)
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

            {/* Scrollable Content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {itemType === 'STORE_DETAIL' || isStore ? (
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
                        refetch();
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
                        ? 'STORE_PRODUCT'
                        : itemType === 'JOB_DETAIL'
                        ? 'JOB_OFFER'
                        : itemType === 'SERVICE_DETAIL'
                        ? 'PROFESSIONAL_PROFILE'
                        : 'POST'
                }
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
});
