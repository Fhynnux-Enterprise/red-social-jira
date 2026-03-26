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
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useTheme } from '../../../theme/ThemeContext';
import { StoryViewerModal } from './StoryViewerModal';

const VIEWED_STORIES_BASE_KEY = '@chunchi_viewed_stories_';

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

const DELETE_STORY = gql`
  mutation DeleteStory($id: String!) {
    deleteStory(id: $id)
  }
`;

/**
 * TAREA 3: RENDIMIENTO VECTORIAL INDIVIDUAL
 */
const BrandingCircle = ({ 
    children, 
    isActive, 
    colors: themeColors, 
    userStories = [],
    viewedStoryIds = []
}: { 
    children: React.ReactNode, 
    isActive: boolean, 
    colors: any, 
    userStories?: Story[],
    viewedStoryIds?: string[]
}) => {
    const size = 92;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2 - 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;
    const count = userStories.length;

    // CRÍTICO ANDROID: Si hay múltiples anillos, los gradientes con el mismo ID se destruyen y quedan negros
    const gradientId = useMemo(() => `chunchiGrad-${Math.random().toString(36).substring(7)}`, []);

    if (!isActive || count === 0) {
        return (
            <View style={[styles.grayBorder, { borderColor: themeColors.border }]}>
                {children}
            </View>
        );
    }

    return (
        <View style={styles.gradientBorder}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Defs>
                    <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#FF4511" />
                        <Stop offset="60%" stopColor={themeColors.primary} />
                        <Stop offset="100%" stopColor={themeColors.secondary} />
                    </SvgGradient>
                </Defs>

                {userStories.map((story, index) => {
                    const isViewed = viewedStoryIds.includes(story.id);
                    const segmentLength = circumference / count;
                    const gap = count > 1 ? 4 : 0;
                    
                    return (
                        <Circle
                            key={`segment-${story.id}-${index}`}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke={isViewed ? '#555555' : `url(#${gradientId})`}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${Math.max(0, segmentLength - gap)} ${circumference}`}
                            // CRÍTICO ANDROID: Usamos origin y rotation en vez de offset matemático para evitar glitches de dibujado
                            originX={center}
                            originY={center}
                            rotation={(index * 360) / count - 90}
                            strokeLinecap="round"
                        />
                    );
                })}
            </Svg>

            <View style={[styles.innerCircle, { backgroundColor: themeColors.background }]}>
                {children}
            </View>
        </View>
    );
};

export const StoriesBar = () => {
    const { user: currentUser } = useAuth();
    const { colors } = useTheme();
    const [isCreating, setIsCreating] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedUserStories, setSelectedUserStories] = useState<Story[]>([]);
    const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]); // El cerebro de la app
    const { uploadMedia } = useMediaUpload();

    // TAREA 2: CARGAR MEMORIA AL MONTAR O CAMBIAR USUARIO
    useEffect(() => {
        if (!currentUser?.id) {
            setViewedStoryIds([]);
            return;
        }

        const loadViewedStories = async () => {
            try {
                const key = `${VIEWED_STORIES_BASE_KEY}${currentUser.id}`;
                const saved = await AsyncStorage.getItem(key);
                if (saved) {
                    setViewedStoryIds(JSON.parse(saved));
                } else {
                    setViewedStoryIds([]);
                }
            } catch (err) {
                console.error("Error cargando vistos:", err);
            }
        };
        loadViewedStories();
    }, [currentUser?.id]);

    // TAREA 2: FUNCIÓN PARA AGREGAR A MEMORIA
    const markStoryAsViewed = async (storyId: string) => {
        if (!currentUser?.id) return;

        setViewedStoryIds(prev => {
            if (prev.includes(storyId)) return prev;
            const updated = [...prev, storyId];
            
            // Guardamos inmediatamente con la llave del usuario
            const key = `${VIEWED_STORIES_BASE_KEY}${currentUser.id}`;
            AsyncStorage.setItem(key, JSON.stringify(updated)).catch(err => {
                console.error("Error guardando vistos:", err);
            });
            return updated;
        });
    };

    const { data, loading, refetch } = useQuery<GetActiveStoriesData>(GET_ACTIVE_STORIES, {
        pollInterval: 300000,
    });

    const [createStory] = useMutation(CREATE_STORY, {
        onCompleted: () => {
            refetch();
            Toast.show({ type: 'success', text1: '¡Historia publicada!' });
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        }
    });

    const [deleteStory] = useMutation(DELETE_STORY, {
        onCompleted: () => {
            refetch();
            Toast.show({ type: 'success', text1: 'Historia eliminada' });
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error eliminando', text2: err.message });
        }
    });

    const handleDeleteStory = (storyId: string) => {
        deleteStory({ variables: { id: storyId } });
        setViewerVisible(false);
    };

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
                finalUri = await VideoCompressor.compress(asset.uri, { compressionMethod: 'auto', maxSize: 720 });
            } else {
                finalUri = await ImageCompressor.compress(asset.uri, { maxWidth: 720, quality: 0.8 });
            }

            const mediaUrl = await uploadMedia(finalUri, type === 'video' ? 'video/mp4' : 'image/jpeg', 'stories');
            await createStory({ variables: { mediaUrl, mediaType: type } });

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

    const renderUserStory = ({ item }: { item: Story }) => {
        const userStories = data?.getActiveStories
            ?.filter(s => s.userId === item.userId)
            ?.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()) || [];

        return (
            <TouchableOpacity 
                style={styles.storyItem} 
                activeOpacity={0.8}
                onPress={() => handleOpenStories(item.userId)}
            >
                <BrandingCircle 
                    isActive={true} 
                    colors={colors} 
                    userStories={userStories} 
                    viewedStoryIds={viewedStoryIds}
                >
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
    }

    const renderAddStory = () => {
        // Obtenemos las historias del usuario actual y las ordenamos ASCENDENTE
        const myStories = data?.getActiveStories
            ?.filter((s: Story) => s.userId === currentUser?.id)
            ?.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()) || [];
            
        const hasStories = myStories.length > 0;
        const lastMyStory = hasStories ? [...myStories].reverse()[0] : null;

        return (
            <View style={styles.userControlsContainer}>
                {/* BOTÓN AGREGAR CON DEGRADADO COMPLETO */}
                <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory} disabled={isCreating}>
                    <BrandingCircle isActive={!isCreating} colors={colors} userStories={[{ id: 'dummy' }] as Story[]} viewedStoryIds={[]}>
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

                {/* MI HISTORIA CON DEGRADADO SEGMENTADO INDIVIDUAL - Solo aparece si hay historias */}
                {hasStories && (
                    <TouchableOpacity 
                        style={styles.storyItem} 
                        onPress={() => handleOpenStories(currentUser!.id)}
                    >
                        <BrandingCircle 
                            isActive={true} 
                            colors={colors} 
                            userStories={myStories} 
                            viewedStoryIds={viewedStoryIds}
                        >
                            <Image 
                                source={{ uri: lastMyStory?.mediaUrl || currentUser?.photoUrl || 'https://via.placeholder.com/150' }} 
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
                )}
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
                    onStorySeen={markStoryAsViewed}
                    onDeleteStory={handleDeleteStory}
                    currentUserId={currentUser?.id}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 2,
        borderBottomWidth: 0.5,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    storyItem: {
        alignItems: 'center',
        marginRight: 12,
        width: 92,
    },
    userControlsContainer: {
        flexDirection: 'row',
    },
    gradientBorder: {
        width: 92,
        height: 92,
        borderRadius: 46,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        position: 'relative',
    },
    grayBorder: {
        width: 92,
        height: 92,
        borderRadius: 46, 
        borderWidth: 1.5,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        position: 'relative',
    },
    innerCircle: {
        width: 82, // Espacio interno ajustado para bordes SVG
        height: 82,
        borderRadius: 41,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    addBtnContent: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        backgroundColor: '#222',
    },
    badgeAvatarContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 32,
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
