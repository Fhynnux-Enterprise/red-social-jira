import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, Image, Platform,
    KeyboardAvoidingView, Keyboard,
} from 'react-native';
import { gql } from '@apollo/client';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import PostCard from '../../feed/components/PostCard';
import CommentsModal from '../../comments/components/CommentsModal';

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const SEARCH_USERS = gql`
  query SearchUsers($searchTerm: String!, $limit: Int, $offset: Int) {
    searchUsers(searchTerm: $searchTerm, limit: $limit, offset: $offset) {
      id
      username
      firstName
      lastName
      photoUrl
      bio
    }
  }
`;

const SEARCH_POSTS = gql`
  query SearchPosts($query: String!, $limit: Int, $offset: Int) {
    searchPosts(query: $query, limit: $limit, offset: $offset) {
      id
      content
      title
      createdAt
      updatedAt
      commentsCount
      media {
        id
        url
        type
        order
      }
      likes {
        id
        user {
          id
          firstName
          lastName
          photoUrl
        }
      }
      author {
        id
        firstName
        lastName
        username
        photoUrl
      }
    }
  }
`;

// ─── Hook: useDebounce ────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// ─── Sub-componente: UserRow ───────────────────────────────────────────────────

const UserRow = ({ user, colors }: { user: any; colors: ThemeColors }) => {
    const router = useRouter();
    const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
    return (
        <TouchableOpacity
            style={[styles.userRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push({ pathname: '/profile', params: { userId: user.id } })}
            activeOpacity={0.75}
        >
            <View style={[styles.userAvatar, { backgroundColor: 'rgba(255,101,36,0.12)', borderColor: 'rgba(255,101,36,0.3)' }]}>
                {user.photoUrl ? (
                    <Image source={{ uri: user.photoUrl }} style={StyleSheet.absoluteFill} />
                ) : (
                    <Text style={styles.userInitials}>{initials}</Text>
                )}
            </View>
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {user.firstName} {user.lastName}
                </Text>
                <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                    @{user.username}
                    {user.bio ? `  ·  ${user.bio}` : ''}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
    );
};

// ─── Estado vacío y placeholder ───────────────────────────────────────────────

const EmptyState = ({ query, type, colors }: { query: string; type: string; colors: ThemeColors }) => (
    <View style={styles.emptyContainer}>
        <Ionicons
            name={type === 'users' ? 'person-outline' : 'document-text-outline'}
            size={56}
            color={colors.textSecondary}
            style={{ opacity: 0.45 }}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {query ? 'Sin resultados' : type === 'users' ? 'Busca personas' : 'Busca publicaciones'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {query
                ? `No encontramos ${type === 'users' ? 'personas' : 'publicaciones'} para "${query}"`
                : type === 'users'
                    ? 'Escribe un nombre o usuario para encontrar personas'
                    : 'Escribe una palabra clave para buscar por título o contenido'}
        </Text>
    </View>
);

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function SearchScreen() {
    const { colors } = useTheme();
    const { user: currentUser } = useAuth() as any;
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);
    const router = useRouter();

    const [searchType, setSearchType] = useState<'users' | 'posts'>('users');
    const [rawQuery, setRawQuery] = useState('');
    const debouncedQuery = useDebounce(rawQuery.trim(), 500);

    const PAGE_SIZE = 5;
    const [hasMoreUsers, setHasMoreUsers] = useState(true);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);

    // ── Queries ───────────────────────────────────────────────────
    const { data: usersData, loading: usersLoading, fetchMore: fetchMoreUsers } = useQuery<any>(SEARCH_USERS, {
        variables: { searchTerm: debouncedQuery, limit: PAGE_SIZE, offset: 0 },
        skip: !debouncedQuery || searchType !== 'users',
        fetchPolicy: 'cache-and-network',
    });

    const { data: postsData, loading: postsLoading, fetchMore: fetchMorePosts } = useQuery<any>(SEARCH_POSTS, {
        variables: { query: debouncedQuery, limit: PAGE_SIZE, offset: 0 },
        skip: !debouncedQuery || searchType !== 'posts',
        fetchPolicy: 'cache-and-network',
    });

    useEffect(() => {
        if (usersData?.searchUsers) {
            setHasMoreUsers(usersData.searchUsers.length >= PAGE_SIZE);
        }
    }, [usersData, PAGE_SIZE]);

    useEffect(() => {
        if (postsData?.searchPosts) {
            setHasMorePosts(postsData.searchPosts.length >= PAGE_SIZE);
        }
    }, [postsData, PAGE_SIZE]);

    const users = usersData?.searchUsers || [];
    const posts = postsData?.searchPosts || [];
    const isLoading = (searchType === 'users' ? usersLoading : postsLoading) && debouncedQuery !== '';

    // Reiniciar paginación cuando cambia la búsqueda
    useEffect(() => {
        setHasMoreUsers(true);
        setHasMorePosts(true);
    }, [debouncedQuery]);

    // Sincronización eliminada: SearchScreen pasa el post más reciente directamente al modal.

    const handleLoadMore = useCallback(async () => {
        if (isFetchingMore || isLoading || !debouncedQuery) return;

        if (searchType === 'users' && hasMoreUsers) {
            setIsFetchingMore(true);
            try {
                await fetchMoreUsers({
                    variables: { offset: users.length },
                    updateQuery: (prev, { fetchMoreResult }) => {
                        if (!fetchMoreResult || !fetchMoreResult.searchUsers.length) {
                            setHasMoreUsers(false);
                            return prev;
                        }
                        if (fetchMoreResult.searchUsers.length < PAGE_SIZE) setHasMoreUsers(false);
                        return {
                            ...prev,
                            searchUsers: [...prev.searchUsers, ...fetchMoreResult.searchUsers],
                        };
                    },
                });
            } catch (e) { console.error(e); }
            finally { setIsFetchingMore(false); }
        } else if (searchType === 'posts' && hasMorePosts) {
            setIsFetchingMore(true);
            try {
                await fetchMorePosts({
                    variables: { offset: posts.length },
                    updateQuery: (prev, { fetchMoreResult }) => {
                        if (!fetchMoreResult || !fetchMoreResult.searchPosts.length) {
                            setHasMorePosts(false);
                            return prev;
                        }
                        if (fetchMoreResult.searchPosts.length < PAGE_SIZE) setHasMorePosts(false);
                        return {
                            ...prev,
                            searchPosts: [...prev.searchPosts, ...fetchMoreResult.searchPosts],
                        };
                    },
                });
            } catch (e) { console.error(e); }
            finally { setIsFetchingMore(false); }
        }
    }, [isFetchingMore, isLoading, searchType, hasMoreUsers, hasMorePosts, debouncedQuery, users.length, posts.length, fetchMoreUsers, fetchMorePosts]);

    const handleClearQuery = () => {
        setRawQuery('');
        setHasMoreUsers(true);
        setHasMorePosts(true);
        inputRef.current?.focus();
    };

    // ── Renders ─────────────────────────────────────────────────────────────
    const renderUser = useCallback(
        ({ item }: { item: any }) => <UserRow user={item} colors={colors} />,
        [colors]
    );

    const renderPost = useCallback(
        ({ item }: { item: any }) => {
            const goToProfile = () => {
                const profileUserId = item.author.id === currentUser?.id ? undefined : item.author.id;
                router.push({ pathname: '/profile', params: { userId: profileUserId } });
            };
            return (
                <PostCard
                    item={item}
                    currentUserId={currentUser?.id}
                    onPressAuthor={goToProfile}
                    onOpenComments={(_: any, initialTab?: 'comments' | 'likes', minimize?: boolean, initialExpanded?: boolean) => 
                        setSelectedPostForComments({ post: item, minimize: !!minimize, initialTab, initialExpanded })
                    }
                />
            );
        },
        [currentUser?.id, router]
    );

    const listData = searchType === 'users' ? users : posts;

    return (
        <KeyboardAvoidingView
            style={[styles.screen, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                {/* Buscador */}
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder={searchType === 'users' ? 'Buscar personas...' : 'Buscar publicaciones...'}
                        placeholderTextColor={colors.textSecondary}
                        value={rawQuery}
                        onChangeText={setRawQuery}
                        autoFocus
                        returnKeyType="search"
                        onSubmitEditing={Keyboard.dismiss}
                        autoCapitalize="none"
                    />
                    {rawQuery.length > 0 && (
                        <TouchableOpacity onPress={handleClearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Segmented Control */}
                <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {(['users', 'posts'] as const).map((type) => {
                        const isActive = searchType === type;
                        return (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.segmentBtn,
                                    isActive && { backgroundColor: '#FF6524', shadowColor: '#FF6524', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }
                                ]}
                                onPress={() => setSearchType(type)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={type === 'users' ? 'people' : 'document-text'}
                                    size={16}
                                    color={isActive ? '#FFF' : colors.textSecondary}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.segmentText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                                    {type === 'users' ? 'Personas' : 'Publicaciones'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── Contenido ───────────────────────────────────────────── */}
            {isLoading && debouncedQuery ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FF6524" />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Buscando...</Text>
                </View>
            ) : (
                <FlatList
                    data={listData}
                    keyExtractor={(item) => item.id}
                    renderItem={searchType === 'users' ? renderUser : renderPost}
                    contentContainerStyle={[
                        styles.listContent,
                        listData.length === 0 && { flex: 1 }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <EmptyState query={debouncedQuery} type={searchType} colors={colors} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isFetchingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color="#FF6524" />
                            </View>
                        ) : null
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Modal de Comentarios */}
            <CommentsModal 
                visible={!!selectedPostForComments} 
                post={
                    selectedPostForComments
                        ? (postsData?.searchPosts?.find((p: any) => p.id === selectedPostForComments.post?.id) ?? selectedPostForComments.post)
                        : null
                }
                nextPost={(() => {
                    const idx = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (idx !== -1 && idx < posts.length - 1) ? posts[idx + 1] : null;
                })()}
                prevPost={(() => {
                    const idx = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    return (idx > 0) ? posts[idx - 1] : null;
                })()}
                onClose={() => setSelectedPostForComments(null)} 
                initialMinimized={selectedPostForComments?.minimize}
                initialTab={selectedPostForComments?.initialTab}
                initialExpanded={selectedPostForComments?.initialExpanded}
                onNextPost={() => {
                    const idx = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (idx !== -1) {
                        if (idx >= posts.length - 2 && hasMorePosts && !isFetchingMore) {
                            handleLoadMore();
                        }
                        if (idx < posts.length - 1) {
                            setSelectedPostForComments({ 
                                ...selectedPostForComments,
                                post: posts[idx + 1],
                                initialExpanded: false 
                            });
                        }
                    }
                }}
                onPrevPost={() => {
                    const idx = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (idx > 0) {
                        setSelectedPostForComments({ 
                            ...selectedPostForComments,
                            post: posts[idx - 1],
                            initialExpanded: false 
                        });
                    }
                }}
                hasMorePosts={hasMorePosts}
            />
        </KeyboardAvoidingView>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 11 : 7,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    segmentedControl: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 3,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 10,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 32,
    },
    // User row
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userInitials: {
        color: '#FF6524',
        fontWeight: '700',
        fontSize: 17,
    },
    userInfo: {
        flex: 1,
        marginRight: 8,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
    },
    userHandle: {
        fontSize: 13,
        marginTop: 2,
    },
    // Loader
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
    },
});
