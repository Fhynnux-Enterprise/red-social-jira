import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, Animated, Dimensions, TouchableOpacity, ActivityIndicator, Image, StatusBar } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCache } from '../../../hooks/useVideoCache';
import { Story } from '../components/StoriesBar';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ConfirmationModal from '../../../features/comments/components/ConfirmationModal';

import { PanResponder } from 'react-native';

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
const StoryVideoPlayer = ({ url, onFinish }: { url: string, onFinish: () => void }) => {
    const { cachedSource } = useVideoCache(url);
    const isMounted = useRef(true);
    
    // Usamos el hook de expo-video con la URL definitiva (caché o red)
    const player = useVideoPlayer(cachedSource || url, (p) => {
        p.loop = false;
        p.play();
    });

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
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Animación de la barra de progreso
    const animValue = useRef(new Animated.Value(0)).current;
    const animRef = useRef<Animated.CompositeAnimation | null>(null);
    
    // Animación de arrastre (Gesto)
    const pan = useRef(new Animated.ValueXY()).current;
    const [isDragging, setIsDragging] = useState(false);
    const longPressTimeout = useRef<any>(null);
    const isClosing = useRef(false);

    const currentStory = stories[currentIndex];

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
                        paddingBottom: insets.bottom,
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
    }
});
