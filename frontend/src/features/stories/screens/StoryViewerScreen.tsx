import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, StyleSheet, ActivityIndicator, TouchableOpacity, Text 
} from 'react-native';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { useAuth } from '../../auth/context/AuthContext';
import { useTheme } from '../../../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEWED_STORIES_BASE_KEY = '@chunchi_viewed_stories_';

const GET_ACTIVE_STORIES = gql`
  query getActiveStories {
    getActiveStories {
      id
      userId
      mediaUrl
      mediaType
      createdAt
      content
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

export default function StoryViewerScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
    const { user: currentUser } = useAuth() as any;
    const { userId, initialStoryId } = route.params || {};

    const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);

    useEffect(() => {
        if (!currentUser?.id) return;
        const loadViewed = async () => {
            const key = `${VIEWED_STORIES_BASE_KEY}${currentUser.id}`;
            const saved = await AsyncStorage.getItem(key);
            if (saved) setViewedStoryIds(JSON.parse(saved));
        };
        loadViewed();
    }, [currentUser?.id]);

    const markStoryAsViewed = async (storyId: string) => {
        if (!currentUser?.id) return;
        setViewedStoryIds(prev => {
            if (prev.includes(storyId)) return prev;
            const updated = [...prev, storyId];
            const key = `${VIEWED_STORIES_BASE_KEY}${currentUser.id}`;
            AsyncStorage.setItem(key, JSON.stringify(updated));
            return updated;
        });
    };

    const { data, loading, error } = useQuery<{ getActiveStories: any[] }>(GET_ACTIVE_STORIES, {
        fetchPolicy: 'network-only'
    });

    const navigationQueue = useMemo(() => {
        if (!data?.getActiveStories) return [];
        
        // TAREA: Si venimos del chat (initialStoryId), solo mostramos las historias de ESE usuario
        let targetUserId = userId;
        if (initialStoryId) {
            const found = data.getActiveStories.find((s: any) => s.id === initialStoryId);
            if (found) targetUserId = found.userId;
        }

        // Agrupar por usuario único
        const groupedMap = new Map<string, any>();
        data.getActiveStories.forEach((s: any) => {
            if (!groupedMap.has(s.userId)) {
                // Si estamos en modo "solo un usuario", filtramos aquí
                if (!initialStoryId || s.userId === targetUserId) {
                    groupedMap.set(s.userId, s);
                }
            }
        });
        
        return Array.from(groupedMap.values());
    }, [data, initialStoryId, userId]);

    const initialUserIndex = useMemo(() => {
        if (!userId || navigationQueue.length === 0) return 0;
        
        let targetId = userId;
        // Si hay una historia inicial, nos aseguramos de que el target sea el dueño de esa historia
        if (initialStoryId && data?.getActiveStories) {
            const s = data.getActiveStories.find((st: any) => st.id === initialStoryId);
            if (s) targetId = s.userId;
        }

        const idx = navigationQueue.findIndex((u: any) => u.userId === targetId);
        return idx !== -1 ? idx : 0;
    }, [navigationQueue, userId, initialStoryId, data]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                <ActivityIndicator size="large" color="#FFF" />
            </View>
        );
    }

    if (error || navigationQueue.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={30} color="#FFF" />
                </TouchableOpacity>
                <Text style={{ color: '#FFF' }}>La historia ya no está disponible</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StoryViewerModal
                visible={true}
                userQueue={navigationQueue}
                allActiveStories={data?.getActiveStories || []}
                initialUserIndex={initialUserIndex}
                initialStoryId={initialStoryId}
                onClose={() => navigation.goBack()}
                onStorySeen={markStoryAsViewed}
                currentUserId={currentUser?.id}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center'
    },
    closeBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10
    }
});
