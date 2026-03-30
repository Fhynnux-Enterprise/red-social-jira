import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, Animated, Dimensions, TouchableOpacity, ActivityIndicator, Image, StatusBar, FlatList, PanResponder, TextInput, Platform, Keyboard } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCache } from '../../../hooks/useVideoCache';
import { Story } from '../components/StoriesBar';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { GET_OR_CREATE_CHAT, SEND_MESSAGE } from '../../chat/graphql/chat.operations';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerModalProps {
    visible: boolean;
    userQueue: Story[];
    allActiveStories: Story[];
    initialUserIndex: number;
    onClose: () => void;
    onStorySeen?: (id: string) => void;
    onDeleteStory?: (id: string) => void;
    currentUserId?: string;
    initialStoryId?: string;
}

/**
 * REPRODUCTOR INTERNO PARA VIDEOS
 */
const StoryVideoPlayer = ({ url, onFinish, isPaused = false, onDurationLoaded }: { url: string, onFinish: () => void, isPaused?: boolean, onDurationLoaded?: (d: number) => void }) => {
    const { cachedSource } = useVideoCache(url);
    const player = useVideoPlayer(cachedSource || url, (p) => {
        p.loop = false;
        if (!isPaused) p.play();
    });

    useEffect(() => {
        if (!player) return;
        if (isPaused) player.pause();
        else player.play();
    }, [player, isPaused]);

    useEffect(() => {
        let mounted = true;
        if (!player) return;
        
        const checkDuration = async () => {
            while (mounted) {
                try {
                    // Verificamos que el reproductor aún sea válido antes de acceder a duration
                    if (player && typeof player.duration === 'number' && player.duration > 0) {
                        onDurationLoaded?.(player.duration * 1000);
                        break;
                    }
                } catch (e) { break; }
                await new Promise(r => setTimeout(r, 300));
            }
        };
        checkDuration();

        const sub = player.addListener('playToEnd', onFinish);
        return () => {
            mounted = false;
            sub.remove();
        };
    }, [player, onFinish, onDurationLoaded]);

    if (!player || !cachedSource) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator color="white" size="large" />
            </View>
        );
    }

    return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
};

const UserStoryPage = ({ 
    userId, userStories, isActiveUser, onFinishUser, onClose,
    onStorySeen, onDeleteStory, currentUserId, getOrCreateChat, sendMessage, panHandlers,
    initialStoryId 
}: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [reply, setReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [storyDuration, setStoryDuration] = useState(5000); // Default 5s
    const animValue = useRef(new Animated.Value(0)).current;
    
    const insets = useSafeAreaInsets();
    const currentStory = userStories[currentIndex] || userStories[0];

    useEffect(() => {
        if (isActiveUser) {
            // TAREA: Calcular el índice inicial si hay un initialStoryId
            let startIdx = 0;
            if (initialStoryId) {
                const foundIdx = userStories.findIndex((s: any) => s.id === initialStoryId);
                if (foundIdx !== -1) startIdx = foundIdx;
            }

            setCurrentIndex(startIdx);
            animValue.setValue(0);
            setIsPaused(false);
            setStoryDuration(currentStory?.mediaType === 'image' ? 5000 : 15000); 
        }
    }, [isActiveUser, userStories, initialStoryId]);

    const handleDurationLoaded = (duration: number) => {
        if (currentStory?.mediaType === 'video') {
            setStoryDuration(duration);
        }
    };

    useEffect(() => {
        if (isActiveUser && currentStory && onStorySeen) onStorySeen(currentStory.id);
    }, [currentIndex, isActiveUser, currentStory, onStorySeen]);

    useEffect(() => {
        if (!isActiveUser || isPaused) {
            animValue.stopAnimation();
            return;
        }
        
        animValue.setValue(0);
        const anim = Animated.timing(animValue, {
            toValue: 1,
            duration: storyDuration,
            useNativeDriver: false,
        });
        anim.start(({ finished }) => { if (finished) handleNext(); });
        return () => animValue.stopAnimation();
    }, [isActiveUser, currentIndex, isPaused, currentStory, storyDuration]);

    const handleNext = () => {
        animValue.setValue(0);
        if (currentIndex < userStories.length - 1) setCurrentIndex(prev => prev + 1);
        else onFinishUser();
    };

    const handlePrev = () => {
        animValue.setValue(0);
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleTap = (evt: any) => {
        const x = evt.nativeEvent.locationX;
        if (x < SCREEN_WIDTH * 0.3) handlePrev();
        else handleNext();
    };

    const handleSendReply = async () => {
        if (!reply.trim() || isSending) return;
        try {
            setIsSending(true); setIsPaused(true);
            const { data } = await getOrCreateChat({ variables: { targetUserId: userId } });
            const convId = data?.getOrCreateOneOnOneChat?.id_conversation;
            if (!convId) throw new Error("No chat");
            await sendMessage({
                variables: {
                    id_conversation: convId,
                    content: `Respondió a tu historia: "${reply.trim()}"`,
                    imageUrl: currentStory.mediaType === 'image' ? currentStory.mediaUrl : null,
                    videoUrl: currentStory.mediaType === 'video' ? currentStory.mediaUrl : null,
                    storyId: currentStory.id
                }
            });
            Toast.show({ type: 'success', text1: 'Respuesta enviada' });
            setReply(''); Keyboard.dismiss();
        } catch (e) { Toast.show({ type: 'error', text1: 'Error al enviar' }); }
        finally { setIsSending(false); setIsPaused(false); }
    };

    const displayName = (currentStory?.user?.firstName || currentStory?.user?.lastName)
        ? `${currentStory.user.firstName || ''} ${currentStory.user.lastName || ''}`.trim()
        : `@${currentStory?.user?.username || 'Usuario'}`;

    const getTimeAgo = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const now = new Date();
            const then = new Date(dateStr);
            const diffMs = now.getTime() - then.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);

            if (diffMin < 1) return 'Ahora';
            if (diffMin < 60) return `${diffMin} min`;
            return `${diffHrs} h`;
        } catch (e) { return ''; }
    };

    return (
        <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
            {/* CAPA DE GESTOS UNIFICADA */}
            <View style={StyleSheet.absoluteFill} {...panHandlers}>
                <TouchableWithoutFeedback 
                    onPressIn={() => setIsPaused(true)} 
                    onPressOut={() => setIsPaused(false)} 
                    onPress={handleTap}
                >
                    <View style={styles.mediaWrapper}>
                        <View style={StyleSheet.absoluteFill} pointerEvents="none">
                            {currentStory?.mediaType === 'video' ? (
                                <StoryVideoPlayer 
                                    key={currentStory.mediaUrl} 
                                    url={currentStory.mediaUrl} 
                                    onFinish={handleNext} 
                                    isPaused={isPaused || !isActiveUser} 
                                    onDurationLoaded={handleDurationLoaded}
                                />
                            ) : (
                                <Image source={{ uri: currentStory?.mediaUrl }} style={styles.fullImage} resizeMode="contain" />
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </View>

            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {/* Progress */}
                <View style={[styles.progressContainer, { top: insets.top + 10 }]}>
                    {userStories.map((_: any, idx: number) => {
                        let w: any = '0%';
                        if (idx < currentIndex) w = '100%';
                        if (idx === currentIndex) w = animValue.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
                        return (
                            <View key={idx} style={styles.barBackground}>
                                <Animated.View style={[styles.progressBar, { width: w, backgroundColor: 'white' }]} />
                            </View>
                        );
                    })}
                </View>

                {/* Header */}
                <View style={[styles.header, { top: insets.top + 35 }]}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: currentStory?.user?.photoUrl || '' }} style={styles.avatar} />
                        <View>
                            <Text style={styles.username}>{displayName}</Text>
                            <Text style={styles.timeAgo}>Hace {getTimeAgo(currentStory?.createdAt)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Caption */}
                {currentStory?.content && !isPaused && (
                    <View style={[styles.captionContainer, { bottom: 170 }]}>
                        <Text style={styles.captionText}>{currentStory.content}</Text>
                    </View>
                )}

                {/* Answer Bar */}
                {currentUserId !== userId && (
                    <View style={[styles.commentInputContainer, { bottom: 34 + insets.bottom }]}>
                        <View style={styles.commentInputWrapper}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Enviar mensaje..."
                                placeholderTextColor="rgba(255,255,255,0.6)"
                                value={reply}
                                onChangeText={setReply}
                                onFocus={() => setIsPaused(true)}
                            />
                            {reply.trim().length > 0 && (
                                <TouchableOpacity style={styles.commentSendBtn} onPress={handleSendReply}>
                                    <Ionicons name="send" size={20} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.quickReactions}>
                            <TouchableOpacity onPress={() => { setReply('🔥'); handleSendReply(); }}><Text style={styles.reactionText}>🔥</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => { setReply('❤️'); handleSendReply(); }}><Text style={styles.reactionText}>❤️</Text></TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

export const StoryViewerModal = ({ visible, userQueue, allActiveStories, initialUserIndex, onClose, onStorySeen, onDeleteStory, currentUserId, initialStoryId }: StoryViewerModalProps) => {
    const [activeUserIndex, setActiveUserIndex] = useState(initialUserIndex);
    const flatListRef = useRef<FlatList>(null);
    const pan = useRef(new Animated.ValueXY()).current;
    const isClosing = useRef(false);
    
    const [getOrCreateChat] = useMutation<any>(GET_OR_CREATE_CHAT);
    const [sendMessage] = useMutation<any>(SEND_MESSAGE);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, gs) => {
                if (isClosing.current) return false;
                return gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx);
            },
            onPanResponderMove: (_, gs) => {
                if (isClosing.current) return;
                pan.setValue({ x: 0, y: Math.max(0, gs.dy) });
            },
            onPanResponderRelease: (_, gs) => {
                if (isClosing.current) return;
                if (gs.dy > 150) {
                    isClosing.current = true;
                    Animated.timing(pan, { toValue: { x: 0, y: SCREEN_HEIGHT }, duration: 180, useNativeDriver: true }).start(onClose);
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 8, tension: 40, useNativeDriver: true }).start();
                }
            }
        })
    ).current;

    const onScroll = (e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (index !== activeUserIndex) setActiveUserIndex(index);
    };

    const handleFinishUser = () => {
        if (activeUserIndex < userQueue.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeUserIndex + 1, animated: true });
        } else {
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View 
                style={[
                    styles.container, 
                    { 
                        transform: [
                            { translateY: pan.y },
                            { 
                                scale: pan.y.interpolate({
                                    inputRange: [0, SCREEN_HEIGHT],
                                    outputRange: [1, 0.85],
                                    extrapolate: 'clamp'
                                })
                            }
                        ],
                        backgroundColor: pan.y.interpolate({
                            inputRange: [0, SCREEN_HEIGHT * 0.3],
                            outputRange: ['black', 'rgba(0,0,0,0.5)'],
                            extrapolate: 'clamp'
                        })
                    }
                ]}
            >
                <FlatList
                    ref={flatListRef}
                    data={userQueue}
                    keyExtractor={(u) => u.userId}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={initialUserIndex >= 0 ? initialUserIndex : 0}
                    getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    extraData={activeUserIndex}
                    renderItem={({ item, index }) => {
                        const userStories = allActiveStories.filter((s: Story) => s.userId === item.userId).sort((a: Story, b: Story) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
                        return (
                            <UserStoryPage 
                                userId={item.userId}
                                userStories={userStories}
                                isActiveUser={index === activeUserIndex}
                                onFinishUser={handleFinishUser}
                                onClose={onClose}
                                onStorySeen={onStorySeen}
                                onDeleteStory={onDeleteStory}
                                currentUserId={currentUserId}
                                getOrCreateChat={getOrCreateChat}
                                sendMessage={sendMessage}
                                panHandlers={panResponder.panHandlers}
                                initialStoryId={index === initialUserIndex ? initialStoryId : undefined}
                            />
                        );
                    }}
                />
                <Toast position="bottom" bottomOffset={SCREEN_HEIGHT / 2 - 75} config={{
                    success: ({ text1 }: any) => (
                        <View style={styles.toastContainer}>
                            <View style={styles.squareToast}>
                                <Ionicons name="checkmark-circle" size={50} color="white" />
                                <Text style={styles.squareToastText}>{text1}</Text>
                            </View>
                        </View>
                    )
                }} />
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    mediaWrapper: { flex: 1, marginHorizontal: 8, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
    fullImage: { flex: 1, width: '100%', height: '100%' },
    header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1.5, borderColor: 'white' },
    username: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    timeAgo: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 0 },
    closeButton: { padding: 8 },
    progressContainer: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', height: 2, gap: 4 },
    barBackground: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
    progressBar: { height: '100%' },
    captionContainer: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)', padding: 15 },
    captionText: { color: '#FFF', fontSize: 16, textAlign: 'center' },
    commentInputContainer: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', padding: 16, alignItems: 'center' },
    commentInputWrapper: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22, paddingHorizontal: 16 },
    commentInput: { flex: 1, color: 'white', paddingVertical: 10 },
    commentSendBtn: { backgroundColor: '#FF6524', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    quickReactions: { flexDirection: 'row', gap: 12, marginLeft: 10 },
    reactionText: { fontSize: 24 },
    loaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
    squareToast: { backgroundColor: 'rgba(0,0,0,0.85)', width: 150, height: 150, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    squareToastText: { color: 'white', fontWeight: 'bold', marginTop: 12, textAlign: 'center', paddingHorizontal: 10 },
    toastContainer: { width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center' }
});
