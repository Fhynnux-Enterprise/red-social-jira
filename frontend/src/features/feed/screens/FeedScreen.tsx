import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Image, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { GET_POSTS, DELETE_POST } from '../graphql/posts.operations';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import CreatePostModal from '../components/CreatePostModal';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { ProfileService, UserProfile } from '../../profile/services/profile.service';
import Toast from 'react-native-toast-message';
import PostCard from '../components/PostCard';
import PostOptionsModal from '../components/PostOptionsModal';
import CommentsModal from '../../comments/components/CommentsModal';

export default function FeedScreen() {
    const { signOut, user: userProfile } = useAuth();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
    const [editingPostContent, setEditingPostContent] = useState<string>('');

    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<{ post: any, minimize: boolean, initialTab?: 'comments' | 'likes' } | null>(null);

    const { data, loading, error, refetch } = useQuery(GET_POSTS, {
        fetchPolicy: 'cache-and-network',
    });

    useFocusEffect(
        useCallback(() => {
            const timeout = setTimeout(() => {
                refetch().catch(e => console.log('Error refetching feed posts:', e));
            }, 500);
            return () => clearTimeout(timeout);
        }, [refetch])
    );

    // Generamos estilos dinámicos que reaccionan al tema
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [deletePost] = useMutation(DELETE_POST, {
        refetchQueries: [{ query: GET_POSTS }],
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Publicación borrada con éxito' });
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        }
    });

    const handleOptionsPress = (item: any) => {
        setSelectedPost(item);
        setIsOptionsMenuVisible(true);
    };

    const handleCreatePostPress = () => {
        setEditingPostId(undefined);
        setEditingPostContent('');
        setIsModalVisible(true);
    };

    const renderPost = ({ item }: { item: any }) => (
        <PostCard
            item={item}
            currentUserId={userProfile?.id}
            onOptionsPress={handleOptionsPress}
            onOpenComments={(_, initialTab, minimize) => setSelectedPostForComments({ post: item, minimize: !!minimize, initialTab })}
        />
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            {/* Cabecera Tipo Facebook */}
            <View style={styles.topHeader}>
                <View style={styles.brandContainer}>
                    {/* <Image
                        source={require('../../../../assets/images/logo-transparente.png')}
                        style={styles.brandLogo}
                    /> */}
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
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="search-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Input "Crear Publicación" Estilo Facebook */}
            <View style={styles.createPostContainer}>
                <View style={styles.createPostRow}>
                    <TouchableOpacity
                        style={[styles.smallAvatarPlaceholder, { overflow: 'hidden', backgroundColor: userProfile && !userProfile.photoUrl ? 'rgba(255, 101, 36, 0.15)' : colors.surface }]}
                        onPress={() => navigation.navigate('Profile' as never)}
                    >
                        {userProfile?.photoUrl ? (
                            <Image source={{ uri: userProfile.photoUrl }} style={{ width: '100%', height: '100%' }} />
                        ) : userProfile ? (
                            <Text style={[styles.avatarText, { fontSize: 14 }]}>
                                {userProfile.firstName?.charAt(0) || ''}{userProfile.lastName?.charAt(0) || ''}
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

            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : error ? (
                    <Text style={styles.errorText}>No se pudieron cargar los posts.</Text>
                ) : (
                    <FlatList
                        data={data?.getPosts || []}
                        extraData={data}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPost}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshing={loading}
                        onRefresh={refetch}
                    />
                )}
            </View>

            {/* Modal para Crear/Editar Publicación */}
            <CreatePostModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                postId={editingPostId}
                initialContent={editingPostContent}
            />

            {/* Modal Menú de Opciones de la Publicación Inferior */}
            <PostOptionsModal
                visible={isOptionsMenuVisible}
                onClose={() => setIsOptionsMenuVisible(false)}
                onEdit={() => {
                    if (selectedPost) {
                        setEditingPostId(selectedPost.id);
                        setEditingPostContent(selectedPost.content);
                        setIsModalVisible(true);
                    }
                }}
                onDelete={() => {
                    if (selectedPost) {
                        deletePost({ variables: { id: selectedPost.id } })
                    }
                }}
            />

            {/* Modal de Comentarios */}
            <CommentsModal 
                visible={!!selectedPostForComments} 
                post={selectedPostForComments?.post} 
                onClose={() => setSelectedPostForComments(null)} 
                initialMinimized={selectedPostForComments?.minimize}
                initialTab={selectedPostForComments?.initialTab}
                onNextPost={() => {
                    const posts = data?.getPosts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex !== -1 && currentIndex < posts.length - 1) {
                        setSelectedPostForComments({ post: posts[currentIndex + 1], minimize: !!selectedPostForComments?.minimize, initialTab: selectedPostForComments?.initialTab });
                    }
                }}
                onPrevPost={() => {
                    const posts = data?.getPosts || [];
                    const currentIndex = posts.findIndex((p: any) => p.id === selectedPostForComments?.post?.id);
                    if (currentIndex > 0) {
                        setSelectedPostForComments({ post: posts[currentIndex - 1], minimize: !!selectedPostForComments?.minimize, initialTab: selectedPostForComments?.initialTab });
                    }
                }}
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
});
