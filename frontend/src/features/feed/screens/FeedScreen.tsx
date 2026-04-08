import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Image, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { GET_POSTS, DELETE_POST } from '../graphql/posts.operations';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import CreatePostModal from '../components/CreatePostModal';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { GET_ME } from '../../profile/graphql/profile.operations';
import Toast from 'react-native-toast-message';
import PostCard from '../components/PostCard';
import PostOptionsModal from '../components/PostOptionsModal';
import CommentsModal from '../../comments/components/CommentsModal';
import { StoriesBar } from '../../stories/components/StoriesBar';

export interface PostAuthor {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photoUrl?: string | null;
}

export interface PostMedia {
    id: string;
    url: string;
    type: string;
    order: number;
}

export interface PostLike {
    id_post_like: string;
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

export default function FeedScreen() {
    const { signOut } = useAuth();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
    const [editingPostContent, setEditingPostContent] = useState<string>('');
    const [editingPostTitle, setEditingPostTitle] = useState<string>('');
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<SelectedPostForComments | null>(null);

    const isFocused = useIsFocused();
    // Estado para trackear qué post está visible en pantalla (para autoplay)
    const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [scrollOffset, setScrollOffset] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const { data, loading, error, refetch, fetchMore, networkStatus } = useQuery<GetPostsData>(GET_POSTS, {
        variables: { limit: 5, offset: 0 },
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
    });

    const { data: meData } = useQuery<GetMeData>(GET_ME, {
        fetchPolicy: 'cache-and-network',
    });
    const currentUser = meData?.me;

    // Ya no usamos useFocusEffect para refetch manual en cada foco para evitar saltos y recargas molestas.
    // Apollo Client con cache-and-network ya se encarga de servir datos de caché inmediatamente.

    // Generamos estilos dinámicos que reaccionan al tema
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [deletePost] = useMutation(DELETE_POST, {
        refetchQueries: [{ query: GET_POSTS, variables: { limit: 5, offset: 0 } }],
    });

    const isFetchingMore = networkStatus === 3;

    const loadMorePosts = useCallback(() => {
        if (loading || isFetchingMore || !hasMore || !data?.getPosts.length) return;

        fetchMore({
            variables: {
                offset: data.getPosts.length,
                limit: 5
            },
        }).then((fetchMoreResult) => {
            // BUG FIX: El resultado de fetchMore contiene los datos en .data
            // Si no hay datos o la longitud es menor al límite, cerramos la paginación
            if (!fetchMoreResult.data || fetchMoreResult.data.getPosts.length < 5) {
                setHasMore(false);
            }
        });
    }, [data?.getPosts.length, fetchMore, loading, isFetchingMore, hasMore]);

    const handleRefresh = useCallback(async () => {
        setHasMore(true);
        await refetch();
    }, [refetch]);

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

    const renderFooter = useCallback(() => {
        if (!hasMore) return null;
        if (!isFetchingMore) return null;
        return (
            <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }, [isFetchingMore, colors.primary, hasMore]);

    const handleOptionsPress = useCallback((item: Post) => {
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
        if (viewableItems.length > 0) {
            setVisiblePostId(viewableItems[0].item.id);
        }
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 55, // 55% visible para activar autoplay
    }).current;

    const renderPost = useCallback(({ item }: { item: Post }) => (
        <PostCard
            item={item}
            currentUserId={currentUser?.id}
            onOptionsPress={handleOptionsPress}
            onOpenComments={(_: any, initialTab?: 'comments' | 'likes', minimize?: boolean, initialExpanded?: boolean) => 
                setSelectedPostForComments({ post: item, minimize: !!minimize, initialTab, initialExpanded })
            }
            isViewable={item.id === visiblePostId}
            isFocused={isFocused}
            isOverlayActive={!!selectedPostForComments || isModalVisible}
        />
    ), [currentUser?.id, handleOptionsPress, visiblePostId, isFocused, selectedPostForComments]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            {/* Cabecera Tipo Facebook */}
            <View style={styles.topHeader}>
                <View style={styles.brandContainer}>
                    <MaskedView
                        style={{ flexDirection: 'row' }}
                        maskElement={
                            <View style={{ backgroundColor: 'transparent', flex: 1, justifyContent: 'center' }}>
                                <Text style={styles.brandTitle}>Chunchi City App</Text>
                            </View>
                        }
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={[styles.brandTitle, { opacity: 0 }]}>Chunchi City App</Text>
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
                </View>
            </View>

            {/* Ya no ponemos el createPostContainer aquí fijo, irá en el ListHeaderComponent del FlatList */}

            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {(loading && networkStatus === 1) || (!data && loading && networkStatus !== 3) ? (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : error && !data ? (
                    <Text style={styles.errorText}>No se pudieron cargar los posts.</Text>
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
                                            <Text style={styles.fakeInputText}>¿Qué está pasando en Chunchi?</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        }
                        data={data?.getPosts || []}
                        extraData={data}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderPost}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshing={loading && networkStatus !== 3}
                        onRefresh={handleRefresh}
                        onScroll={(event) => {
                            setScrollOffset(event.nativeEvent.contentOffset.y);
                        }}
                        onEndReached={loadMorePosts}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        ListEmptyComponent={renderEmpty}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        initialNumToRender={5}
                        maxToRenderPerBatch={5}
                        windowSize={10}
                        removeClippedSubviews={Platform.OS === 'android'}
                    />
                )}
            </View>

            {/* Modal para Crear/Editar Publicación */}
            <CreatePostModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                postId={editingPostId}
                initialContent={editingPostContent}
                initialTitle={editingPostTitle}
            />

            {/* Modal Menú de Opciones de la Publicación Inferior */}
            <PostOptionsModal
                visible={isOptionsMenuVisible}
                onClose={() => setIsOptionsMenuVisible(false)}
                onEdit={() => {
                    if (selectedPost) {
                        setEditingPostId(selectedPost.id);
                        setEditingPostContent(selectedPost.content);
                        setEditingPostTitle(selectedPost.title || '');
                        setIsModalVisible(true);
                    }
                }}
                onDelete={() => {
                    if (selectedPost) {
                        deletePost({ variables: { id: selectedPost.id } })
                            .then(() => Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Publicación borrada con éxito' }))
                            .catch((err: any) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }));
                    }
                }}
            />

            {/* Modal de Comentarios */}
            <CommentsModal 
                visible={!!selectedPostForComments} 
                post={
                    selectedPostForComments
                        ? (data?.getPosts?.find((p: any) => p.id === selectedPostForComments.post?.id) ?? selectedPostForComments.post)
                        : null
                }
                nextPost={(() => {
                    const posts = data?.getPosts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (currentIndex !== -1 && currentIndex < posts.length - 1) ? posts[currentIndex + 1] : null;
                })()}
                prevPost={(() => {
                    const posts = data?.getPosts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (currentIndex > 0) ? posts[currentIndex - 1] : null;
                })()}
                onClose={() => setSelectedPostForComments(null)} 
                initialMinimized={selectedPostForComments?.minimize}
                initialTab={selectedPostForComments?.initialTab}
                initialExpanded={selectedPostForComments?.initialExpanded}
                onNextPost={() => {
                    const posts = data?.getPosts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    
                    if (currentIndex !== -1) {
                        // PREFETCH: Cargamos más datos desde el servidor ANTES de que el usuario llegue al final
                        if (currentIndex >= posts.length - 3 && hasMore && !isFetchingMore) {
                            loadMorePosts();
                        }

                        if (currentIndex < posts.length - 1) {
                            setSelectedPostForComments({ 
                                post: posts[currentIndex + 1], 
                                minimize: !!selectedPostForComments?.minimize, 
                                initialTab: selectedPostForComments?.initialTab, 
                                initialExpanded: false 
                            });
                        } else if (hasMore) {
                            // Si deslizó pero no se ha cargado todavía
                            Toast.show({ type: 'info', text1: 'Cargando más...', text2: 'Por favor, intenta deslizar de nuevo en un segundo.' });
                            if (!isFetchingMore) loadMorePosts();
                        } else {
                            // Se acabó la base de datos
                            Toast.show({ type: 'info', text1: 'Has visto todo', text2: 'Llegaste al final de las publicaciones.' });
                        }
                    }
                }}
                onPrevPost={() => {
                    const posts = data?.getPosts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex > 0) {
                        setSelectedPostForComments({ post: posts[currentIndex - 1], minimize: !!selectedPostForComments?.minimize, initialTab: selectedPostForComments?.initialTab, initialExpanded: false });
                    }
                }}
                onOptionsPress={(post) => {
                    setSelectedPost(post);
                    setIsOptionsMenuVisible(true);
                }}
                hasMorePosts={hasMore}
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandLogo: {
        width: 34,
        height: 34,
        marginRight: 10,
        borderRadius: 8,
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: '900', // <-- AQUÍ CAMBIAS EL GROSOR ('bold', 'normal', '100' hasta '900')
        fontFamily: '', // <-- AQUÍ CAMBIAS EL TIPO DE LETRA (Ej en Android: 'sans-serif', 'sans-serif-condensed', 'serif')
        letterSpacing: 1,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createPostContainer: {
        padding: 16,
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
});
