import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Image, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { GET_POSTS, DELETE_POST, GET_FEED } from '../graphql/posts.operations';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
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
import FeedItemDetailModal from '../components/FeedItemDetailModal';
import StoreProductCard from '../../store/components/StoreProductCard';
import ListFooter from '../../../components/ListFooter';
import NotificationBell from '../../notifications/components/NotificationBell';
import CreateProductModal from '../../store/components/CreateProductModal';

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

export default function FeedScreen() {
    const { signOut } = useAuth();
    const { colors, isDark } = useTheme();
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
    const resumeCommentsRef = useRef<any>(null);

    const isFocused = useIsFocused();
    // Estado para trackear qué post está visible en pantalla (para autoplay)
    const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [scrollOffset, setScrollOffset] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const { data, loading, error, refetch, fetchMore, networkStatus } = useQuery<{ getFeed: any[] }>(GET_FEED, {
        variables: { limit: 10, offset: 0 },
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
        refetchQueries: [{ query: GET_FEED, variables: { limit: 10, offset: 0 } }],
    });

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
        if (viewableItems.length > 0) {
            setVisiblePostId(viewableItems[0].item.id);
        }
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 55, // 55% visible para activar autoplay
    }).current;

    const renderFeedItem = useCallback(({ item }: { item: any }) => {

        if (item.__typename === 'JobOffer') {
            const mappedItem = { 
                ...item, 
                title: item.jobTitle ?? item.title, 
                media: item.jobMedia ?? [] 
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
            />;
        }
        if (item.__typename === 'ProfessionalProfile') {
            const mappedItem = { 
                ...item, 
                media: item.profMedia ?? [] 
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
            />;
        }
        if (item.__typename === 'StoreProduct') {
            const mappedItem = {
                ...item,
                title: item.storeTitle ?? item.title,
                media: item.storeMedia ?? [],
                location: item.storeLocation,
                contactPhone: item.storeContactPhone,
            };
            return <StoreProductCard 
                item={mappedItem} 
                onPress={() => setSelectedPostForComments({ post: mappedItem, minimize: true, initialTab: 'comments', initialExpanded: false })}
                onCommentPress={() => setSelectedPostForComments({ post: mappedItem, minimize: false, initialTab: 'comments', initialExpanded: false })}
                onEdit={(itemToEdit) => {
                    setEditingProduct(itemToEdit);
                    setIsStoreModalVisible(true);
                }}
            />;
        }
        
        // Default: Post
        const mappedPost = {
            ...item,
            media: item.postMedia ?? []
        };
        
        return (
            <PostCard
                item={mappedPost}
                currentUserId={currentUser?.id}
                onOptionsPress={handleOptionsPress}
                onOpenComments={(_, initialTab, minimize, initialExpanded) =>
                    setSelectedPostForComments({ post: mappedPost, minimize: !!minimize, initialTab, initialExpanded })
                }
                isViewable={item.id === visiblePostId}
                isFocused={isFocused}
                isOverlayActive={!!selectedPostForComments || isModalVisible}
            />
        );
    }, [currentUser?.id, handleOptionsPress, visiblePostId, isFocused, selectedPostForComments, isModalVisible]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            {/* Cabecera Tipo Facebook */}
            <View style={styles.topHeader}>
                <View style={styles.brandContainer}>
                    <Image
                        source={require('../../../../assets/images/icon-transparent.png')}
                        style={styles.brandLogo}
                        resizeMode="contain"
                    />
                    <MaskedView
                        style={{ flex: 1, flexDirection: 'row' }}
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
                    <NotificationBell />
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
                            {error.message}
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
                                            <Text style={styles.fakeInputText}>¿Qué está pasando en Chunchi?</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        }
                        data={data?.getFeed || []}
                        extraData={data}
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
                onEdit={() => {
                    if (selectedPost) {
                        const type = selectedPost.__typename;
                        setIsOptionsMenuVisible(false);
                        // Ya no cerramos el CommentsModal aquí para que permanezca abierto al terminar de editar

                        if (type === 'StoreProduct') {
                            setEditingProduct(selectedPost);
                            setIsStoreModalVisible(true);
                        } else if (type === 'JobOffer' || type === 'ProfessionalProfile') {
                            router.push({
                                pathname: '/jobs/create',
                                params: { 
                                    editId: selectedPost.id, 
                                    editData: JSON.stringify(selectedPost),
                                    initialTab: type === 'ProfessionalProfile' ? 'service' : 'offer'
                                }
                            });
                        } else {
                            // Default: Post
                            setEditingPostId(selectedPost.id);
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
                        
                        // Si es algo diferente a Post, el borrado se maneja diferente en la DB (usamos el delete correspondiente)
                        // Pero para simplicidad, si es Post usamos deletePost mutation
                        if (!type || type === 'Post') {
                            deletePost({ variables: { id: selectedPost.id } })
                                .then(() => Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Publicación borrada con éxito' }))
                                .catch((err: any) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }));
                        } else {
                            // Para Store y Jobs, el Delete está en sus respectivos componentes, 
                            // pero si se dispara desde aquí podemos mostrar un aviso o implementar el delete global
                            Alert.alert("Eliminar", "¿Estás seguro de eliminar esta publicación?", [
                                { text: "Cancelar", style: "cancel" },
                                { text: "Eliminar", style: "destructive", onPress: () => {
                                    // Implementar borrado según tipo si es necesario
                                    Toast.show({ type: 'info', text1: 'Aviso', text2: 'Usa el menú de la tarjeta para eliminar este tipo de contenido.' });
                                }}
                            ]);
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

            {/* CommentsModal — siempre montado para mantener estado y UI fluida */}
            <CommentsModal
                visible={!!selectedPostForComments}
                post={
                    selectedPostForComments
                        ? (data?.getFeed?.find((p: any) => p.id === selectedPostForComments.post?.id) ?? selectedPostForComments.post)
                        : null
                }
                nextPost={(() => {
                    const feed = data?.getFeed || [];
                    const currentIndex = feed.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (currentIndex !== -1 && currentIndex < feed.length - 1) ? feed[currentIndex + 1] : null;
                })()}
                prevPost={(() => {
                    const feed = data?.getFeed || [];
                    const currentIndex = feed.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (currentIndex > 0) ? feed[currentIndex - 1] : null;
                })()}
                onClose={() => setSelectedPostForComments(null)}
                initialMinimized={selectedPostForComments?.minimize}
                initialTab={selectedPostForComments?.initialTab}
                initialExpanded={selectedPostForComments?.initialExpanded}
                onNextPost={() => {
                    const feed = data?.getFeed || [];
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
                    const feed = data?.getFeed || [];
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
        width: 50,
        height: 50,
        marginRight: 4,
        marginTop: 2,
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
        marginLeft: -35,
        marginTop: 10,
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
});
