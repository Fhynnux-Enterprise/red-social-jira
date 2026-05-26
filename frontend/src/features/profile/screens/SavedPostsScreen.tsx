import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_SAVED_POSTS, TOGGLE_SAVE_POST } from '../../feed/graphql/posts.operations';
import PostCard from '../../feed/components/PostCard';
import StoreProductCard from '../../store/components/StoreProductCard';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
import CommentsModal from '../../comments/components/CommentsModal';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

export default function SavedPostsScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const [selectedPostForComments, setSelectedPostForComments] = useState<any | null>(null);

    const { data, loading, refetch, fetchMore, networkStatus } = useQuery(GET_SAVED_POSTS, {
        variables: { limit: 10, offset: 0 },
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
    });

    const savedPosts = data?.getSavedPosts || [];

    const [toggleSavePost] = useMutation(TOGGLE_SAVE_POST);

    const handleToggleSave = useCallback(async (item: any) => {
        if (!item) return;
        const itemType =
            item.__typename === 'JobOffer' ? 'JOB_OFFER' :
            item.__typename === 'ProfessionalProfile' ? 'PROFESSIONAL_PROFILE' :
            item.__typename === 'StoreProduct' ? 'STORE_PRODUCT' : 'POST';
        const wasSaved = true; // Todo lo renderizado aquí ya está guardado
        try {
            await toggleSavePost({
                variables: { postId: item.id, itemType },
                optimisticResponse: { toggleSavePost: false }, // Al hacer clic lo estamos quitando
                refetchQueries: [{ query: GET_SAVED_POSTS }],
                update: (cache, { data: mutData }) => {
                    const cacheId = cache.identify({ __typename: item.__typename, id: item.id });
                    if (cacheId) {
                        cache.modify({ id: cacheId, fields: { isSaved: () => !!mutData?.toggleSavePost } });
                    }
                },
            });
            Toast.show({
                type: 'success',
                text1: wasSaved ? 'Quitado de guardados' : 'Guardado correctamente',
                position: 'bottom',
            });
        } catch {
            Toast.show({ type: 'error', text1: 'No se pudo procesar la acción', position: 'bottom' });
        }
    }, [toggleSavePost]);

    const handleRefresh = useCallback(() => { refetch(); }, [refetch]);

    const loadMore = useCallback(() => {
        if (loading || networkStatus === 3 || savedPosts.length < 10) return;
        fetchMore({ variables: { offset: savedPosts.length } });
    }, [loading, networkStatus, savedPosts.length, fetchMore]);

    const openComments = (item: any) =>
        setSelectedPostForComments({ post: item, minimize: true, initialTab: 'comments' });

    const renderItem = ({ item }: { item: any }) => {
        console.log(`[SavedPostsScreen] item type: ${item.__typename}, id: ${item.id}`, JSON.stringify(item, null, 2));
        if (item.__typename === 'StoreProduct') {
            const mapped = {
                ...item,
                title: item.storeTitle ?? item.postTitle ?? item.title,
                media: item.storeMedia ?? item.postMedia ?? item.media ?? [],
                location: item.storeLocation ?? item.location,
                contactPhone: item.storeContactPhone ?? item.contactPhone,
            };
            return (
                <StoreProductCard
                    item={mapped}
                    onPress={() => openComments(mapped)}
                    onCommentPress={() => setSelectedPostForComments({ post: mapped, minimize: false, initialTab: 'comments' })}
                    onToggleSave={() => handleToggleSave(mapped)}
                    isSaved={true}
                />
            );
        }
        if (item.__typename === 'JobOffer') {
            const mapped = {
                ...item,
                title: item.jobTitle ?? item.postTitle ?? item.title,
                media: item.jobMedia ?? item.postMedia ?? item.media ?? [],
                location: item.jobLocation ?? item.location,
                contactPhone: item.jobContactPhone ?? item.contactPhone,
            };
            return (
                <JobOfferCard
                    item={mapped}
                    onPress={() => openComments(mapped)}
                    onToggleSave={() => handleToggleSave(mapped)}
                    isSaved={true}
                />
            );
        }
        if (item.__typename === 'ProfessionalProfile') {
            const mapped = {
                ...item,
                media: item.profMedia ?? item.postMedia ?? item.media ?? [],
                contactPhone: item.profContactPhone ?? item.contactPhone,
            };
            return (
                <ProfessionalCard
                    item={mapped}
                    onPress={() => openComments(mapped)}
                    onToggleSave={() => handleToggleSave(mapped)}
                    isSaved={true}
                />
            );
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
                isSaved={true}
                onOpenComments={() => openComments(mappedPost)}
                onToggleSave={() => handleToggleSave(mappedPost)}
                currentUserId=""
            />
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Publicaciones Guardadas</Text>
            </View>

            {savedPosts && savedPosts.length > 0 && (
                <View style={{ padding: 10, backgroundColor: 'rgba(255,0,0,0.1)' }}>
                    <Text style={{ fontSize: 10, color: colors.text }}>
                        DEBUG 1st item: {JSON.stringify(savedPosts[0])}
                    </Text>
                </View>
            )}

            {loading && networkStatus === 1 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : savedPosts.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="bookmark-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        Aún no tienes publicaciones guardadas
                    </Text>
                    <TouchableOpacity style={styles.browseButton} onPress={() => navigation.goBack()}>
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.browseButtonText}>Explorar el Feed</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={savedPosts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshing={networkStatus === 4}
                    onRefresh={handleRefresh}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        networkStatus === 3
                            ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
                            : null
                    }
                />
            )}

            {selectedPostForComments && (
                <CommentsModal
                    visible={!!selectedPostForComments}
                    post={(() => {
                        if (!selectedPostForComments) return null;
                        const original = savedPosts.find((p: any) => p.id === selectedPostForComments.post?.id);
                        if (!original) return selectedPostForComments.post;
                        if (original.__typename === 'StoreProduct') {
                            return {
                                ...original,
                                title: original.storeTitle ?? original.postTitle ?? original.title,
                                media: original.storeMedia ?? original.postMedia ?? original.media ?? [],
                                location: original.storeLocation ?? original.location,
                                contactPhone: original.storeContactPhone ?? original.contactPhone,
                            };
                        }
                        if (original.__typename === 'JobOffer') {
                            return {
                                ...original,
                                title: original.jobTitle ?? original.postTitle ?? original.title,
                                media: original.jobMedia ?? original.postMedia ?? original.media ?? [],
                                location: original.jobLocation ?? original.location,
                                contactPhone: original.jobContactPhone ?? original.contactPhone,
                            };
                        }
                        if (original.__typename === 'ProfessionalProfile') {
                            return {
                                ...original,
                                media: original.profMedia ?? original.postMedia ?? original.media ?? [],
                                contactPhone: original.profContactPhone ?? original.contactPhone,
                            };
                        }
                        return {
                            ...original,
                            title: original.postTitle ?? original.title,
                            media: original.postMedia ?? original.media ?? []
                        };
                    })()}
                    onClose={() => {
                        setSelectedPostForComments(null);
                        refetch();
                    }}
                    onRefreshPost={refetch}
                    initialMinimized={selectedPostForComments.minimize}
                />
            )}
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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    list: { paddingBottom: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 24 },
    browseButton: { borderRadius: 25, overflow: 'hidden', width: '100%' },
    gradient: { paddingVertical: 12, alignItems: 'center' },
    browseButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
