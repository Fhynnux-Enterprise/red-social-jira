import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, Animated, Dimensions, TouchableOpacity, ActivityIndicator, Image, StatusBar } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCache } from '../../../hooks/useVideoCache';
import { Story } from '../components/StoriesBar';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ConfirmationModal from '../../../features/comments/components/ConfirmationModal';

import { PanResponder, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useMutation } from '@apollo/client/react';
import { GET_OR_CREATE_CHAT, SEND_MESSAGE } from '../../chat/graphql/chat.operations';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerModalProps {
    visible: boolean;
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
    onStorySeen?: (id: string) => void;
    onDeleteStory?: (id: string) => void;
    currentUserId?: string;
}

/**
 * REPRODUCTOR INTERNO PARA VIDEOS EN HISTORIAS
 * Utiliza el sistema de caché para optimizar el consumo de datos.
 */
const StoryVideoPlayer = ({ url, onFinish, isPaused = false }: { url: string, onFinish: () => void, isPaused?: boolean }) => {
    const { cachedSource } = useVideoCache(url);
    const isMounted = useRef(true);
    
    const player = useVideoPlayer(cachedSource || url, (p) => {
        p.loop = false;
        if (!isPaused) p.play();
    });

    useEffect(() => {
        if (!player) return;
        if (isPaused) {
            player.pause();
        } else {
            player.play();
        }
    }, [player, isPaused]);

    useEffect(() => {
        isMounted.current = true;
        const subscription = player.addListener('playToEnd', () => {
            if (isMounted.current) onFinish();
        });
        return () => {
            isMounted.current = false;
            subscription.remove();
        };
    }, [player, onFinish]);

    // CRÍTICO: Si no hay player o no hay puente con la URL, mostramos loader
    if (!player || !cachedSource) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator color="white" size="large" />
            </View>
        );
    }

    return (
        <VideoView 
            player={player} 
            style={StyleSheet.absoluteFill} 
            contentFit="cover" 
            nativeControls={false} 
        />
    );
};

export const StoryViewerModal = ({ visible, stories, initialIndex, onClose, onStorySeen, onDeleteStory, currentUserId }: StoryViewerModalProps) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [reply, setReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Animación de Teclado (Estilo CommentsModal)
    const keyboardOffset = useRef(new Animated.Value(Math.max(insets.bottom, 15))).current;

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        
        const showSub = Keyboard.addListener(showEvent, (e) => {
            Animated.timing(keyboardOffset, {
                toValue: e.endCoordinates.height + 55,
                duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
                useNativeDriver: false,
            }).start();
        });
        
        const hideSub = Keyboard.addListener(hideEvent, (e) => {
            Animated.timing(keyboardOffset, {
                toValue: Math.max(insets.bottom, 15),
                duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
                useNativeDriver: false,
            }).start();
        });
        
        return () => { showSub.remove(); hideSub.remove(); };
    }, [insets.bottom]);
    
    // Animación de la barra de progreso
    const animValue = useRef(new Animated.Value(0)).current;
    const animRef = useRef<Animated.CompositeAnimation | null>(null);
    
    // Animación de arrastre (Gesto)
    const pan = useRef(new Animated.ValueXY()).current;
    const [isDragging, setIsDragging] = useState(false);
    const longPressTimeout = useRef<any>(null);
    const isClosing = useRef(false);

    const [getOrCreateChat] = useMutation<any>(GET_OR_CREATE_CHAT);
    const [sendMessage] = useMutation<any>(SEND_MESSAGE);

    const currentStory = stories[currentIndex];

    const handleSendReply = async () => {
        if (!reply.trim() || isSending) return;
        
        try {
            setIsSending(true);
            setIsPaused(true);

            // 1. Obtener o crear la conversación con el autor de la historia
            const { data: chatData } = await getOrCreateChat({
                variables: { targetUserId: currentStory.userId }
            });

            const conversationId = chatData?.getOrCreateOneOnOneChat?.id_conversation;

            if (!conversationId) throw new Error("No se pudo iniciar el chat");

            // 2. Enviar el mensaje (Podríamos incluir el link de la historia si quisiéramos)
            await sendMessage({
                variables: {
                    id_conversation: conversationId,
                    content: `Respondió a tu historia: "${reply.trim()}"`,
                    imageUrl: currentStory.mediaType === 'image' ? currentStory.mediaUrl : null,
                    videoUrl: currentStory.mediaType === 'video' ? currentStory.mediaUrl : null,
                    storyId: currentStory.id
                }
            });

            Toast.show({
                type: 'success',
                text1: 'Respuesta enviada',
                text2: `Tu mensaje ha sido enviado a ${displayName}`
            });

            setReply('');
            setIsPaused(false);
            Keyboard.dismiss();
            // Opcional: Avanzar a la siguiente historia tras responder
            // handleNext();
        } catch (error: any) {
            console.error("Error al enviar respuesta:", error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar la respuesta' });
        } finally {
            setIsSending(false);
        }
    };

    // GESTO: Arrastrar SOLO abajo para cerrar (Estilo Instagram/TikTok)
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (isClosing.current) return false;
                // Solo activamos si el arrastre es predominantemente vertical y hacia ABAJO
                return Math.abs(gestureState.dy) > 10 && gestureState.dy > 0;
            },
            onPanResponderGrant: () => {
                // No pausamos aquí, esperamos el timeout del Touchable
                setIsDragging(true);
            },
            onPanResponderMove: (_, gestureState) => {
                const newY = Math.max(0, gestureState.dy);
                pan.setValue({ x: 0, y: newY });
                // Si arrastramos, cancelamos cualquier intento de pausa por long press
                if (longPressTimeout.current) {
                    clearTimeout(longPressTimeout.current);
                    longPressTimeout.current = null;
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const threshold = 150;
                if (gestureState.dy > threshold) {
                    isClosing.current = true;
                    Animated.timing(pan, {
                        toValue: { x: 0, y: SCREEN_HEIGHT + 100 },
                        duration: 200,
                        useNativeDriver: true
                    }).start(() => {
                        pan.setValue({ x: 0, y: SCREEN_HEIGHT + 100 });
                        onClose();
                    });
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        friction: 8,
                        tension: 40,
                        useNativeDriver: true
                    }).start(() => {
                        setIsPaused(false);
                        setIsDragging(false);
                    });
                }
            }
        })
    ).current;

    // Interpolación para el fondo: Solo se desvanece al bajar
    const backdropOpacity = pan.y.interpolate({
        inputRange: [0, SCREEN_HEIGHT / 2],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    // Resetear el índice cuando se abre el modal
    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            setIsPaused(false);
            isClosing.current = false;
            pan.setValue({ x: 0, y: 0 });
            setIsDragging(false);
            if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
        }
    }, [visible, initialIndex]);

    // MARCAR COMO VISTA CADA VEZ QUE CAMBIA EL ÍNDICE
    useEffect(() => {
        if (visible && currentStory && onStorySeen) {
            onStorySeen(currentStory.id);
        }
    }, [currentIndex, visible, currentStory, onStorySeen]);

    // Motor de Animación de la Barra
    const startProgressAnim = useCallback(() => {
        // @ts-ignore
        const currentValue = animValue._value || 0;
        const totalDuration = currentStory?.mediaType === 'image' ? 5000 : 45000;
        const remainingDuration = (1 - currentValue) * totalDuration;

        animRef.current = Animated.timing(animValue, {
            toValue: 1,
            duration: remainingDuration,
            useNativeDriver: false,
        });

        animRef.current.start(({ finished }: { finished: boolean }) => {
            if (finished) if (!showDeleteConfirm && !isPaused) handleNext();
        });
    }, [currentStory, currentIndex, showDeleteConfirm, isPaused]);

    // Función para avanzar
    const handleNext = () => {
        animValue.setValue(0);
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    // Función para retroceder
    const handlePrev = () => {
        animValue.setValue(0);
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // Iniciar o reanudar animación
    useEffect(() => {
        if (visible && currentStory && !showDeleteConfirm && !isPaused && !isClosing.current) {
            startProgressAnim();
        } else {
            animValue.stopAnimation();
        }
        return () => animValue.stopAnimation();
    }, [visible, currentIndex, currentStory, showDeleteConfirm, isPaused]);

    const handleTap = (evt: any) => {
        // Si ya está pausado, significa que fue un Long Press, no navegamos
        if (showDeleteConfirm || isPaused || isClosing.current) return;
        
        const x = evt.nativeEvent.locationX;
        if (x < SCREEN_WIDTH / 2) {
            handlePrev();
        } else {
            handleNext();
        }
    };

    const handlePressIn = () => {
        // Iniciamos el timer para pausa (Long Press) 200ms
        longPressTimeout.current = setTimeout(() => {
            setIsPaused(true);
        }, 200);
    };

    const handlePressOut = () => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }
        setIsPaused(false);
    };

    if (!currentStory) return null;

    // TAREA 2: Mostrar Nombre Apellido si existen, sino Username
    const displayName = currentStory.user.firstName || currentStory.user.lastName
        ? `${currentStory.user.firstName || ''} ${currentStory.user.lastName || ''}`.trim()
        : `@${currentStory.user.username}`;

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}
        >
            <Animated.View 
                style={[
                    styles.container, 
                    { 
                        paddingTop: insets.top, 
                        // Eliminamos paddingBottom aquí para que no interfiera con el bottom absoluto de la barra
                        opacity: backdropOpacity,
                        transform: [{ translateY: pan.y }]
                    }
                ]}
                {...panResponder.panHandlers}
            >
                {/* Renderizado de Medios */}
                <View style={styles.mediaWrapper}>
                    {currentStory.mediaType === 'video' ? (
                        <StoryVideoPlayer 
                            key={currentStory.mediaUrl} 
                            url={currentStory.mediaUrl!} 
                            onFinish={handleNext} 
                            isPaused={isPaused}
                        />
                    ) : (
                        <Image 
                            source={{ uri: currentStory.mediaUrl }} 
                            style={styles.fullImage} 
                            resizeMode="contain"
                        />
                    )}
                </View>

                {/* Header Info - Ahora más abajo (insets.top + 30) */}
                {!isPaused && !isClosing.current && (
                    <View style={[styles.header, { top: insets.top + 35 }]}>
                        <View style={styles.userInfo}>
                            <Image source={{ uri: currentStory.user.photoUrl || '' }} style={styles.avatar} />
                            <Text style={styles.username}>{displayName}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {currentUserId === currentStory.userId && (
                                <TouchableOpacity 
                                    onPress={() => setShowDeleteConfirm(true)} 
                                    style={[styles.closeButton, { marginRight: 15 }]}
                                >
                                    <Ionicons name="ellipsis-horizontal" size={26} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* TAREA: Barra de Respuesta (Solo para otros usuarios) */}
                {!isClosing.current && currentUserId !== currentStory.userId && (
                    <Animated.View style={[styles.replyContainer, { bottom: keyboardOffset }]}>
                        <View style={styles.replyInputWrapper}>
                            <TextInput
                                style={styles.replyInput}
                                placeholder="Enviar mensaje..."
                                placeholderTextColor="rgba(255,255,255,0.7)"
                                value={reply}
                                onChangeText={setReply}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                                multiline
                            />
                            {reply.trim().length > 0 && (
                                <TouchableOpacity 
                                    style={styles.sendButton} 
                                    onPress={handleSendReply}
                                    disabled={isSending}
                                >
                                    {isSending ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Ionicons name="send" size={20} color="white" />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 15, marginLeft: 10 }}>
                            <TouchableOpacity onPress={() => { setReply('🔥'); handleSendReply(); }}>
                                <Text style={{ fontSize: 24 }}>🔥</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setReply('❤️'); handleSendReply(); }}>
                                <Text style={{ fontSize: 24 }}>❤️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setReply('😮'); handleSendReply(); }}>
                                <Text style={{ fontSize: 24 }}>😮</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                {/* TAREA 1: Gestos de navegación invisibles con Hold-to-Pause Retardado */}
                <TouchableWithoutFeedback 
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={handleTap}
                >
                    <View style={styles.gestureOverlay} />
                </TouchableWithoutFeedback>

                {/* TAREA 3: Barra de progreso Animada */}
                <View style={[styles.progressContainer, { top: insets.top + 10 }]}>
                    {stories.map((_, index) => {
                        let barWidth: any = '0%';
                        if (index < currentIndex) barWidth = '100%';
                        if (index === currentIndex) {
                            barWidth = animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%']
                            });
                        }

                        return (
                            <View key={index} style={styles.barBackground}>
                                <Animated.View 
                                    style={[
                                        styles.progressBar, 
                                        { width: barWidth, backgroundColor: 'white' }
                                    ]} 
                                />
                            </View>
                        );
                    })}
                </View>

                {/* NOTA: Eliminamos el /KeyboardAvoidingView de aquí */}

                <ConfirmationModal 
                    visible={showDeleteConfirm}
                    title="Eliminar Historia"
                    message="¿Estás seguro de que deseas eliminar esta historia? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    confirmColor={colors.primary}
                    onConfirm={() => {
                        setShowDeleteConfirm(false);
                        onDeleteStory?.(currentStory.id);
                    }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    gestureOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'white',
    },
    username: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    closeButton: {
        padding: 4,
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    mediaWrapper: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        marginHorizontal: 8,
    },
    fullImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    progressContainer: {
        position: 'absolute',
        top: 40,
        left: 10,
        right: 10,
        flexDirection: 'row',
        height: 2,
        gap: 4,
    },
    barBackground: {
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
    },
    captionContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 20,
        paddingVertical: 15,
        zIndex: 5,
    },
    captionText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    replyContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 20,
    },
    replyInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    replyInput: {
        flex: 1,
        color: 'white',
        fontSize: 14,
        maxHeight: 100,
        paddingTop: Platform.OS === 'ios' ? 0 : 4,
    },
    sendButton: {
        marginLeft: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
