import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, Animated, Dimensions, TouchableOpacity, ActivityIndicator, Image, StatusBar, ScrollView, FlatList, PanResponder, TextInput, Platform, Keyboard } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCache } from '../../../hooks/useVideoCache';
import { Story } from '../components/StoriesBar';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmationModal from '../../../features/comments/components/ConfirmationModal';
import { useMutation } from '@apollo/client/react';
import { GET_OR_CREATE_CHAT, SEND_MESSAGE } from '../../chat/graphql/chat.operations';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerModalProps {
    visible: boolean;
    userQueue: Story[]; // Lista representativa de usuarios
    allActiveStories: Story[]; // Todas las historias de todos
    initialUserIndex: number;
    onClose: () => void;
    onStorySeen?: (id: string) => void;
    onDeleteStory?: (id: string) => void;
    currentUserId?: string;
}

/**
 * REPRODUCTOR INTERNO PARA VIDEOS
 */
const StoryVideoPlayer = ({ url, onFinish, isPaused = false }: { url: string, onFinish: () => void, isPaused?: boolean }) => {
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
        if (!player) return;
        const sub = player.addListener('playToEnd', onFinish);
        return () => sub.remove();
    }, [player, onFinish]);

    if (!player || !cachedSource) {
        return (
            <View style={[styles.loaderContainer, { backgroundColor: 'transparent' }]}>
                <ActivityIndicator color="white" size="large" />
            </View>
        );
    }

    return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
};

/**
 * PÁGINA INDIVIDUAL PARA UN USUARIO (Bloque de sus historias)
 */
const UserStoryPage = ({ 
    userId, 
    userStories, 
    isActiveUser, 
    onFinishUser, 
    onClose,
    onStorySeen,
    onDeleteStory,
    currentUserId,
    getOrCreateChat,
    sendMessage 
}: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [reply, setReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    const animValue = useRef(new Animated.Value(0)).current;
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const currentStory = userStories[currentIndex] || userStories[0];

    // Resetear historias de este usuario al activarse
    useEffect(() => {
        if (isActiveUser) {
            setCurrentIndex(0);
            animValue.setValue(0);
            setIsPaused(false);
        }
    }, [isActiveUser]);

    useEffect(() => {
        if (isActiveUser && currentStory && onStorySeen) {
            onStorySeen(currentStory.id);
        }
    }, [currentIndex, isActiveUser, currentStory, onStorySeen]);

    // Timer de progreso
    useEffect(() => {
        if (!isActiveUser || isPaused || showDeleteConfirm) {
            animValue.stopAnimation();
            return;
        }

        const duration = currentStory?.mediaType === 'image' ? 5000 : 45000;
        
        animValue.setValue(0); // Reiniciamos siempre al inicio del efecto
        const anim = Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
        });

        anim.start(({ finished }) => {
            if (finished) handleNext();
        });

        return () => animValue.stopAnimation();
    }, [isActiveUser, currentIndex, isPaused, showDeleteConfirm, currentStory]);

    const handleNext = () => {
        animValue.setValue(0);
        if (currentIndex < userStories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onFinishUser();
        }
    };

    const handlePrev = () => {
        animValue.setValue(0);
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
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

    return (
        <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
            {/* Medios */}
            <TouchableWithoutFeedback 
                onPressIn={() => setIsPaused(true)} 
                onPressOut={() => setIsPaused(false)} 
                onPress={handleTap}
            >
                <View style={styles.mediaWrapper}>
                    {currentStory?.mediaType === 'video' ? (
                        <StoryVideoPlayer key={currentStory.mediaUrl} url={currentStory.mediaUrl} onFinish={handleNext} isPaused={isPaused || !isActiveUser} />
                    ) : (
                        <Image source={{ uri: currentStory?.mediaUrl }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </TouchableWithoutFeedback>

            {/* Descripcion */}
            {currentStory?.content && !isPaused && (
                <View style={[styles.captionContainer, { bottom: 170 }]}>
                    <Text style={styles.captionText}>{currentStory.content}</Text>
                </View>
            )}

            {/* Header */}
            <View style={[styles.header, { top: insets.top + 35 }]}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: currentStory?.user?.photoUrl || '' }} style={styles.avatar} />
                    <Text style={styles.username}>{displayName}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
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
    );
};

/**
 * MODAL PRINCIPAL: CARROUSEL DE USUARIOS
 */
export const StoryViewerModal = ({ visible, userQueue, allActiveStories, initialUserIndex, onClose, onStorySeen, onDeleteStory, currentUserId }: StoryViewerModalProps) => {
    const [activeUserIndex, setActiveUserIndex] = useState(initialUserIndex);
    const flatListRef = useRef<FlatList>(null);
    const pan = useRef(new Animated.ValueXY()).current;
    const isClosing = useRef(false);

    const [getOrCreateChat] = useMutation<any>(GET_OR_CREATE_CHAT);
    const [sendMessage] = useMutation<any>(SEND_MESSAGE);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10 && Math.abs(gs.dx) < 10,
            onPanResponderMove: (_, gs) => {
                pan.setValue({ x: 0, y: Math.max(0, gs.dy) });
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 150) {
                    isClosing.current = true;
                    Animated.timing(pan, { toValue: { x: 0, y: SCREEN_HEIGHT }, duration: 200, useNativeDriver: true }).start(onClose);
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
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
                style={[styles.container, { transform: [{ translateY: pan.y }] }]}
                {...panResponder.panHandlers}
            >
                <FlatList
                    ref={flatListRef}
                    data={userQueue}
                    keyExtractor={(item) => item.userId}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={initialUserIndex >= 0 ? initialUserIndex : 0}
                    getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    extraData={activeUserIndex}
                    windowSize={3}
                    renderItem={({ item, index }) => {
                        const userStories = allActiveStories.filter(s => s.userId === item.userId).sort((a,b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
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
                            />
                        );
                    }}
                />

                <Toast 
                    position="bottom"
                    bottomOffset={SCREEN_HEIGHT / 2 - 50} 
                    config={{
                        success: ({ text1 }: any) => (
                            <View style={styles.squareToast}><Ionicons name="checkmark-circle" size={50} color="white" /><Text style={styles.squareToastText}>{text1}</Text></View>
                        )
                    }}
                />
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    mediaWrapper: { flex: 1, marginHorizontal: 8, borderRadius: 20, overflow: 'hidden' },
    fullImage: { flex: 1, width: '100%', height: '100%' },
    header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 1, borderColor: 'white' },
    username: { color: 'white', fontWeight: 'bold' },
    closeButton: { padding: 8, zIndex: 20 },
    progressContainer: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', height: 2, gap: 4 },
    barBackground: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
    progressBar: { height: '100%' },
    captionContainer: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)', padding: 15, zIndex: 5 },
    captionText: { color: '#FFF', fontSize: 16, textAlign: 'center' },
    commentInputContainer: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', padding: 16, alignItems: 'center' },
    commentInputWrapper: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22, paddingHorizontal: 16, marginRight: 10 },
    commentInput: { flex: 1, color: 'white', paddingVertical: 10 },
    commentSendBtn: { backgroundColor: '#FF6524', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    quickReactions: { flexDirection: 'row', gap: 12 },
    reactionText: { fontSize: 24 },
    loaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    squareToast: { backgroundColor: 'rgba(0,0,0,0.85)', width: 150, height: 150, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    squareToastText: { color: 'white', fontWeight: 'bold', marginTop: 12 }
});
