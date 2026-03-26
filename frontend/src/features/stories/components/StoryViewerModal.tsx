import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Modal, View, StyleSheet, Image, 
    Dimensions, TouchableWithoutFeedback, 
    ActivityIndicator, StatusBar, Text,
    TouchableOpacity, Animated
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCache } from '../../../hooks/useVideoCache';
import { Story } from '../components/StoriesBar';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerModalProps {
    visible: boolean;
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
}

/**
 * REPRODUCTOR INTERNO PARA VIDEOS EN HISTORIAS
 * Utiliza el sistema de caché para optimizar el consumo de datos.
 */
const StoryVideoPlayer = ({ url, onFinish }: { url: string, onFinish: () => void }) => {
    const { cachedSource } = useVideoCache(url);
    const isMounted = useRef(true);

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

    if (!cachedSource) {
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

export const StoryViewerModal = ({ visible, stories, initialIndex, onClose }: StoryViewerModalProps) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const animValue = useRef(new Animated.Value(0)).current;

    const currentStory = stories[currentIndex];

    // Resetear el índice cuando se abre el modal
    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
        }
    }, [visible, initialIndex]);

    // Motor de Animación de la Barra
    const startProgressAnim = useCallback(() => {
        animValue.setValue(0);
        // Duración: 5s para fotos, 45s (máximo) para videos
        const duration = currentStory?.mediaType === 'image' ? 5000 : 45000;
        
        Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
        }).start(({ finished }: { finished: boolean }) => {
            if (finished) handleNext();
        });
    }, [currentStory, currentIndex]);

    // Función para avanzar
    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    // Función para retroceder
    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // Iniciar animación al cargar cada historia
    useEffect(() => {
        if (visible && currentStory) {
            startProgressAnim();
        } else {
            animValue.stopAnimation();
        }
        return () => animValue.stopAnimation();
    }, [visible, currentIndex, currentStory]);

    const handleTap = (evt: any) => {
        const x = evt.nativeEvent.locationX;
        if (x < SCREEN_WIDTH * 0.3) {
            handlePrev();
        } else {
            handleNext();
        }
    };

    if (!currentStory) return null;

    // TAREA 2: Mostrar Nombre Apellido si existen, sino Username
    const displayName = currentStory.user.firstName || currentStory.user.lastName
        ? `${currentStory.user.firstName || ''} ${currentStory.user.lastName || ''}`.trim()
        : `@${currentStory.user.username}`;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
                <View style={[styles.header, { top: insets.top + 35 }]}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: currentStory.user.photoUrl || '' }} style={styles.avatar} />
                        <Text style={styles.username}>{displayName}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* TAREA 1: Gestos de navegación invisibles */}
                <TouchableWithoutFeedback onPress={handleTap}>
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
            </View>
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
