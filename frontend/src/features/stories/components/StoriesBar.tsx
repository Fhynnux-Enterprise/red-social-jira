import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    View, Text, FlatList, StyleSheet, Image, 
    TouchableOpacity, ActivityIndicator 
} from 'react-native';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageCompressor, Video as VideoCompressor } from 'react-native-compressor';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useTheme } from '../../../theme/ThemeContext';
import { StoryViewerModal } from './StoryViewerModal';

export interface StoryUser {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string | null;
}

export interface Story {
    id: string;
    userId: string;
    user: StoryUser;
    mediaUrl?: string;
    mediaType?: string;
    createdAt?: string;
    expiresAt?: string;
}

interface GetActiveStoriesData {
    getActiveStories: Story[];
}

const GET_ACTIVE_STORIES = gql`
  query getActiveStories {
    getActiveStories {
      id
      userId
      mediaUrl
      mediaType
      createdAt
      user {
        id
        username
        firstName
        lastName
        photoUrl
      }
    }
  }
`;

const CREATE_STORY = gql`
  mutation CreateStory($mediaUrl: String!, $mediaType: String!) {
    createStory(mediaUrl: $mediaUrl, mediaType: $mediaType) {
      id
      mediaUrl
      mediaType
    }
  }
`;

/**
 * COMPONENTE DE ANILLO DE MARCA (Degradado como Chunchi App)
 */
const BrandingCircle = ({ children, isActive, colors: themeColors }: { children: React.ReactNode, isActive: boolean, colors: any }) => {
    if (isActive) {
        return (
            <LinearGradient
                colors={['#FF4B2B', themeColors.primary, themeColors.secondary]} // LA MEZCLA MAESTRA: TOMATE -> NARANJA -> AMARILLO
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBorder}
            >
                <View style={[styles.innerCircle, { backgroundColor: themeColors.background }]}>
                    {children}
                </View>
            </LinearGradient>
        );
    }
    return (
        <View style={[styles.grayBorder, { borderColor: themeColors.border }]}>
            {children}
        </View>
    );
};

export const StoriesBar = () => {
    const { user: currentUser } = useAuth();
    const { colors } = useTheme();
    const [isCreating, setIsCreating] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedUserStories, setSelectedUserStories] = useState<Story[]>([]);
    const { uploadMedia } = useMediaUpload();

    const { data, loading, refetch } = useQuery<GetActiveStoriesData>(GET_ACTIVE_STORIES, {
        pollInterval: 300000,
    });

    const [createStory] = useMutation(CREATE_STORY, {
        onCompleted: () => {
            refetch();
            Toast.show({ type: 'success', text1: '¡Historia publicada!', text2: 'Tus amigos ya pueden verla.' });
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        }
    });

    const handleCreateStory = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
                videoMaxDuration: 45,
            });

            if (result.canceled || !result.assets[0]) return;

            setIsCreating(true);
            const asset = result.assets[0];
            const type = asset.type === 'video' ? 'video' : 'image';
            let finalUri = asset.uri;

            if (type === 'video') {
                finalUri = await VideoCompressor.compress(asset.uri, {
                    compressionMethod: 'auto',
                    maxSize: 720,
                });
            } else {
                finalUri = await ImageCompressor.compress(asset.uri, {
                    maxWidth: 720,
                    quality: 0.8,
                });
            }

            const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
            const mediaUrl = await uploadMedia(finalUri, mimeType, 'stories');

            await createStory({
                variables: { mediaUrl, mediaType: type }
            });

        } catch (err: any) {
            console.error('Error al crear historia:', err);
            Toast.show({ type: 'error', text1: 'Error en la subida', text2: err.message });
        } finally {
            setIsCreating(false);
        }
    };

    const storiesByUser = useMemo(() => {
        if (!data?.getActiveStories) return [];
        const groupedMap = new Map<string, Story>();
        const sorted = [...data.getActiveStories].sort((a, b) => 
            new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
        );
        sorted.forEach((story) => {
            if (story.userId !== currentUser?.id) {
                groupedMap.set(story.userId, story);
            }
        });
        return Array.from(groupedMap.values()).reverse();
    }, [data, currentUser]);

    const handleOpenStories = (userId: string) => {
        const userStories = data?.getActiveStories
            ?.filter((s: Story) => s.userId === userId)
            ?.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()) || [];
            
        if (userStories.length > 0) {
            setSelectedUserStories(userStories);
            setViewerVisible(true);
        }
    };

    const renderUserStory = ({ item }: { item: Story }) => (
        <TouchableOpacity 
            style={styles.storyItem} 
            activeOpacity={0.8}
            onPress={() => handleOpenStories(item.userId)}
        >
            <BrandingCircle isActive={true} colors={colors}>
                <Image source={{ uri: item.mediaUrl }} style={styles.previewImage} />
                <View style={[styles.badgeAvatarContainer, { borderColor: colors.background }]}>
                    <Image 
                        source={{ uri: item.user?.photoUrl || 'https://via.placeholder.com/150' }} 
                        style={styles.badgeAvatar}
                    />
                </View>
            </BrandingCircle>
            <Text numberOfLines={1} style={[styles.username, { color: colors.text }]}>
                {item.user.firstName || item.user.username}
            </Text>
        </TouchableOpacity>
    );

    const renderAddStory = () => {
        const myStories = data?.getActiveStories?.filter((s: Story) => s.userId === currentUser?.id) || [];
        const hasStories = myStories.length > 0;
        const lastMyStory = hasStories ? myStories.sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0] : null;

        return (
            <View style={styles.userControlsContainer}>
                {/* BOTÓN AGREGAR CON DEGRADADO */}
                <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory} disabled={isCreating}>
                    <BrandingCircle isActive={!isCreating} colors={colors}>
                        <View style={[styles.addBtnContent, { backgroundColor: colors.surface }]}>
                            {isCreating ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="add" size={34} color={colors.primary} />
                            )}
                        </View>
                    </BrandingCircle>
                    <Text style={[styles.username, { color: colors.text }]}>Agregar</Text>
                </TouchableOpacity>

                {/* MI HISTORIA CON DEGRADADO */}
                <TouchableOpacity 
                    style={styles.storyItem} 
                    onPress={() => hasStories ? handleOpenStories(currentUser!.id) : handleCreateStory()}
                >
                    <BrandingCircle isActive={hasStories} colors={colors}>
                        <Image 
                            source={{ uri: (hasStories ? lastMyStory?.mediaUrl : currentUser?.photoUrl) || 'https://via.placeholder.com/150' }} 
                            style={styles.previewImage}
                        />
                        <View style={[styles.badgeAvatarContainer, { borderColor: colors.background }]}>
                            <Image 
                                source={{ uri: currentUser?.photoUrl || 'https://via.placeholder.com/150' }} 
                                style={styles.badgeAvatar}
                            />
                        </View>
                    </BrandingCircle>
                    <Text style={[styles.username, { color: colors.text }]}>Mi Historia</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading && !data) return null;

    return (
        <View style={[styles.container, { borderBottomColor: colors.border }]}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={storiesByUser}
                keyExtractor={(item) => `story-${item.userId}`}
                renderItem={renderUserStory}
                ListHeaderComponent={renderAddStory}
                contentContainerStyle={styles.listContent}
            />

            {viewerVisible && (
                <StoryViewerModal 
                    visible={viewerVisible} 
                    stories={selectedUserStories} 
                    initialIndex={0} 
                    onClose={() => setViewerVisible(false)} 
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 2, // ESPACIO VERTICAL: Reduce este número para que haya menos espacio arriba/abajo
        borderBottomWidth: 0.5,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    storyItem: {
        alignItems: 'center',
        marginRight: 12, // ESPACIO HORIZONTAL: Baja este número para que los círculos estén más juntos
        width: 92,
    },
    userControlsContainer: {
        flexDirection: 'row',
    },
    gradientBorder: {
        width: 92, // Debe coincidir con el TAMAÑO BASE
        height: 92,
        borderRadius: 46, // Siempre la mitad del tamaño base
        padding: 3, 
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6, // Espacio entre el círculo y el nombre
    },
    grayBorder: {
        width: 92, // Debe coincidir con el TAMAÑO BASE
        height: 92,
        borderRadius: 46, // Siempre la mitad del tamaño base
        borderWidth: 1.5,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    innerCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 44,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtnContent: {
        width: '100%',
        height: '100%',
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 44,
        backgroundColor: '#222',
    },
    badgeAvatarContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 32, // Tamaño de la mini foto de perfil
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    badgeAvatar: {
        width: '100%',
        height: '100%',
    },
    username: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
    },
});
