import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, Image, StyleSheet, Dimensions, FlatList,
    TouchableOpacity, Modal, BackHandler, PanResponder, Animated,
    Pressable
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ZoomableImageViewer from './ZoomableImageViewer';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../../../components/CustomToast';

import { useMute } from '../../../contexts/MuteContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MediaItem {
    url: string;
    type: string;
    order: number;
}

interface ImageCarouselProps {
    media: MediaItem[];
    onPress?: () => void;
    containerWidth?: number;
    imageResizeMode?: 'cover' | 'contain' | 'stretch';
    customAspectRatio?: number;
    disableFullscreen?: boolean;
    dynamicAspectRatio?: boolean;
    isViewable?: boolean; // Prop para autoplay vertical
    isFocused?: boolean; // Candado: pause when navigating away
    isOverlayActive?: boolean; // Bloqueo de reproducción (modal abierto)
    isInteractive?: boolean; // Habilita controles avanzados (Play/Pause inmediato, Slider, Fullscreen)
    /** Llamado cuando el índice activo cambia (útil para el padre) */
    onIndexChange?: (index: number) => void;
    /**
     * Llamado cuando el usuario hace swipe-to-close desde la imagen.
     * - En imagen única: al arrastrar hacia la izquierda con suficiente recorrido.
     * - En carrusel: solo si ya está en la última imagen.
     */
    onSwipeClose?: (panX: Animated.Value) => void;
}

export default function ImageCarousel({
    media,
    onPress,
    containerWidth,
    imageResizeMode = 'cover',
    customAspectRatio,
    disableFullscreen = false,
    dynamicAspectRatio = false,
    isViewable = true,
    isFocused = true,
    isOverlayActive = false,
    isInteractive = false,
    onIndexChange,
    onSwipeClose,
}: ImageCarouselProps) {
    // Garantizamos el orden desde el frontend para evitar que la normalización de caché 
    // de Apollo altere el carrusel cuando falta el OrderBy en la BD en consultas viejas.
    const sortedMedia = React.useMemo(() => {
        if (!media) return [];
        return [...media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [media]);

    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { isGlobalMuted, toggleGlobalMute } = useMute();
    const [activeIndex, setActiveIndex] = useState(0);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
    const [viewerActiveIndex, setViewerActiveIndex] = useState(0);
    const [calculatedAspect, setCalculatedAspect] = useState<number | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);

    // Sincronizar el índice cuando se abre el visor
    useEffect(() => {
        if (viewerVisible) {
            setViewerActiveIndex(viewerInitialIndex);
        }
    }, [viewerVisible, viewerInitialIndex]);

    // Ref para conocer el índice activo dentro del PanResponder (sin stale closure)
    const activeIndexRef = useRef(0);
    // Animated.Value que le pasamos al padre para el efecto visual de cierre
    const slideX = useRef(new Animated.Value(0)).current;

    const carouselRef = useRef<any>(null);
    const flatListScrolling = useRef(false);
    // Periodo de gracia: ignora gestos justo después de llegar rápido a la última imagen
    const recentlyArrivedAtEnd = useRef(false);

    // ── Back-button en Android dentro del visor ──
    useEffect(() => {
        if (!viewerVisible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            setViewerVisible(false);
            return true;
        });
        return () => sub.remove();
    }, [viewerVisible]);

    const isFirstItemVideo = sortedMedia && sortedMedia.length > 0 && sortedMedia[0].type === 'video';

    // ── Aspect ratio dinámico ──
    useEffect(() => {
        if (dynamicAspectRatio && media && media.length > 0 && !isFirstItemVideo) {
            Image.getSize(media[0].url, (w, h) => {
                if (h > 0) setCalculatedAspect(w / h);
            }, () => { });
        }
    }, [dynamicAspectRatio, media, isFirstItemVideo]);

    const activeAspectRatio = dynamicAspectRatio && calculatedAspect
        ? calculatedAspect
        : (customAspectRatio || (isFirstItemVideo ? (9 / 16) : (4 / 5)));

    const ITEM_WIDTH = containerWidth ?? SCREEN_WIDTH;

    // ── Reset al cambiar de post ──
    useEffect(() => {
        if (carouselRef.current && sortedMedia && sortedMedia.length > 0) {
            carouselRef.current.scrollToOffset({ offset: 0, animated: false });
        }
        setActiveIndex(0);
        activeIndexRef.current = 0;
        slideX.setValue(0);
        onIndexChange?.(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortedMedia]);

    if (!sortedMedia || sortedMedia.length === 0) return null;

    // ── Press ──
    const handleMainPress = useCallback((index: number) => {
        if (!disableFullscreen) {
            setViewerInitialIndex(index);
            setViewerVisible(true);
        } else {
            onPress?.();
        }
    }, [disableFullscreen, onPress]);

    // ── PanResponder para imagen ÚNICA ──
    const singleImagePan = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
            g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
            if (g.dx < 0) slideX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
            if (g.dx < -(SCREEN_WIDTH * 0.45) || g.vx < -0.9) {
                onSwipeClose?.(slideX);
            } else {
                Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
            }
        },
        onPanResponderTerminate: () => {
            Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
        },
    })).current;

    // ── PanResponder para CARRUSEL ──
    const carouselClosePan = useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => {
            if (recentlyArrivedAtEnd.current) return false;
            return Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        },
        onPanResponderMove: (_, g) => {
            if (g.dx < 0) slideX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
            if (g.dx < -(SCREEN_WIDTH * 0.40)) {
                onSwipeClose?.(slideX);
            } else if (g.dx > 40 && activeIndexRef.current > 0) {
                Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
                const prevIndex = activeIndexRef.current - 1;
                carouselRef.current?.scrollToIndex({ index: prevIndex, animated: true });
                setActiveIndex(prevIndex);
                activeIndexRef.current = prevIndex;
                onIndexChange?.(prevIndex);
            } else {
                Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
            }
        },
        onPanResponderTerminate: () => {
            Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
        },
    })).current;

    // ── renderItem ──
    const renderItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
        const itemHeight = ITEM_WIDTH / activeAspectRatio;
        return (
            <View style={{ width: ITEM_WIDTH, height: itemHeight, overflow: 'hidden' }}>
                {item.type === 'video' ? (
                    <InteractiveVideoPlayer
                        url={item.url}
                        width={ITEM_WIDTH}
                        height={itemHeight}
                        isMuted={isGlobalMuted}
                        shouldPlay={isViewable && isFocused && activeIndex === index && !isOverlayActive}
                        toggleMute={toggleGlobalMute}
                        isInteractive={isInteractive}
                        onPress={() => handleMainPress(index)}
                    />
                ) : (
                    <TouchableOpacity activeOpacity={1} onPress={() => handleMainPress(index)}>
                        <Image
                            source={{ uri: item.url }}
                            style={[styles.mediaItem, { width: ITEM_WIDTH, height: itemHeight, backgroundColor: colors.surface }]}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                )}
            </View>
        );
    }, [ITEM_WIDTH, activeAspectRatio, colors, handleMainPress, activeIndex, isGlobalMuted, isViewable, isFocused, toggleGlobalMute, isOverlayActive, isInteractive]);

    return (
        <View style={styles.container}>
            <View style={{ width: ITEM_WIDTH, overflow: 'hidden' }}>
                {sortedMedia.length === 1 ? (
                    <Animated.View
                        {...singleImagePan.panHandlers}
                        style={{ transform: [{ translateX: slideX }] }}
                    >
                        {renderItem({ item: sortedMedia[0], index: 0 })}
                    </Animated.View>
                ) : (
                    <Animated.View
                        {...(activeIndex === sortedMedia.length - 1 ? carouselClosePan.panHandlers : {})}
                        style={{ transform: [{ translateX: slideX }] }}
                    >
                        <FlatList
                            ref={carouselRef}
                            data={sortedMedia}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => `${item.url}-${index}`}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            bounces={false}
                            overScrollMode="never"
                            scrollEnabled={activeIndex < media.length - 1}
                            getItemLayout={(_, index) => ({
                                length: ITEM_WIDTH,
                                offset: ITEM_WIDTH * index,
                                index,
                            })}
                            onMomentumScrollEnd={(event) => {
                                flatListScrolling.current = false;
                                const xOffset = event.nativeEvent.contentOffset.x;
                                const index = Math.round(xOffset / ITEM_WIDTH);
                                if (index !== activeIndexRef.current) {
                                    setActiveIndex(index);
                                    activeIndexRef.current = index;
                                    onIndexChange?.(index);
                                }
                                if (index === sortedMedia.length - 1) {
                                    recentlyArrivedAtEnd.current = true;
                                    setTimeout(() => { recentlyArrivedAtEnd.current = false; }, 300);
                                }
                            }}
                        />
                    </Animated.View>
                )}
            </View>

            {sortedMedia.length > 1 && (
                <View style={styles.counter} pointerEvents="none">
                    <Text style={styles.counterText}>{activeIndex + 1}/{sortedMedia.length}</Text>
                </View>
            )}

            {sortedMedia.length > 1 && (
                <View style={styles.pagination} pointerEvents="none">
                    {sortedMedia.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: index === activeIndex ? colors.primary : 'rgba(255,255,255,0.5)' },
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Modal de Pantalla Completa */}
            <Modal visible={viewerVisible} transparent animationType="fade"
                onRequestClose={() => setViewerVisible(false)}
            >
                <View style={styles.viewerContainer}>
                    <TouchableOpacity
                        style={[styles.closeViewerButton, { top: insets.top + 10 }]}
                        onPress={() => setViewerVisible(false)}
                    >
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>

                    <FlatList
                        data={sortedMedia}
                        horizontal
                        pagingEnabled
                        scrollEnabled={!isZoomed}
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={viewerInitialIndex}
                        getItemLayout={(_, index) => ({
                            length: SCREEN_WIDTH,
                            offset: SCREEN_WIDTH * index,
                            index,
                        })}
                        onMomentumScrollEnd={(event) => {
                            const xOffset = event.nativeEvent.contentOffset.x;
                            const index = Math.round(xOffset / SCREEN_WIDTH);
                            setViewerActiveIndex(index);
                        }}
                        keyExtractor={(item, index) => `viewer-${item.url}-${index}`}
                        renderItem={({ item, index }) => (
                            <View style={[styles.viewerSlide, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
                                {item.type === 'video' ? (
                                    <InteractiveVideoPlayer
                                        url={item.url}
                                        width={SCREEN_WIDTH}
                                        height={SCREEN_HEIGHT}
                                        isMuted={isGlobalMuted}
                                        shouldPlay={viewerActiveIndex === index && viewerVisible}
                                        toggleMute={toggleGlobalMute}
                                        isInteractive={true}
                                        resizeMode={ResizeMode.CONTAIN}
                                    />
                                ) : (
                                    <ZoomableImageViewer url={item.url}
                                        onClose={() => setViewerVisible(false)}
                                        onZoomChange={setIsZoomed} />
                                )}
                            </View>
                        )}
                    />
                </View>
                <Toast config={customToastConfig} position="top" topOffset={60} />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: 6,
        marginBottom: 8,
        position: 'relative',
    },
    mediaItem: { width: '100%', height: '100%' },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        left: 0,
        right: 0,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginHorizontal: 3,
    },
    counter: {
        position: 'absolute',
        top: 10,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    counterText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    closeViewerButton: {
        position: 'absolute',
        right: 16,
        zIndex: 20,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    viewerSlide: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    muteButtonContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    centerControl: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    sliderContainer: {
        position: 'absolute',
        bottom: 24,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
});

/**
 * Tarea 1, 2 y 3: Componente InteractiveVideoPlayer
 */
function InteractiveVideoPlayer({
    url,
    width,
    height,
    isMuted,
    shouldPlay,
    toggleMute,
    isInteractive,
    onPress,
    resizeMode = ResizeMode.COVER
}: {
    url: string;
    width: number;
    height: number;
    isMuted: boolean;
    shouldPlay: boolean;
    toggleMute: () => void;
    isInteractive?: boolean;
    onPress?: () => void;
    resizeMode?: ResizeMode;
}) {
    const { colors } = useTheme();
    const videoRef = useRef<Video>(null);
    const [status, setStatus] = useState<any>({});
    const [showControls, setShowControls] = useState(false);
    const controlsTimeout = useRef<any>(null);

    const resetControlsTimeout = () => {
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => setShowControls(false), 2500);
    };

    const handlePress = async () => {
        if (!isInteractive) {
            onPress?.();
            return;
        }

        if (status.isPlaying) {
            await videoRef.current?.pauseAsync();
            setShowControls(true);
            if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        } else {
            await videoRef.current?.playAsync();
            setShowControls(false);
        }
    };

    return (
        <View style={{ width, height, backgroundColor: '#000' }}>
            <Pressable onPress={handlePress} style={{ width, height }}>
                <Video
                    ref={videoRef}
                    source={{ uri: url }}
                    style={{ width, height }}
                    resizeMode={resizeMode}
                    isLooping
                    isMuted={isMuted}
                    shouldPlay={shouldPlay}
                    onPlaybackStatusUpdate={(s) => setStatus(s)}
                />

                {(showControls || (status.isLoaded && !status.isPlaying)) && isInteractive && (
                    <View style={styles.videoOverlay}>
                        <View style={styles.centerControl}>
                            <Ionicons
                                name={status.isPlaying ? 'pause' : 'play'}
                                size={50}
                                color="white"
                                style={{ marginLeft: status.isPlaying ? 0 : 5 }}
                            />
                        </View>
                    </View>
                )}
            </Pressable>

            {isInteractive && (
                <>
                    {/* Expand button below mute button */}
                    <TouchableOpacity
                        style={[styles.muteButtonContainer, { top: 52 }]}
                        activeOpacity={0.7}
                        onPress={() => videoRef.current?.presentFullscreenPlayer()}
                    >
                        <Ionicons name="expand" size={16} color="white" />
                    </TouchableOpacity>

                    {/* Slider at the bottom */}
                    <View style={styles.sliderContainer}>
                        <Slider
                            style={{ width: width - 40, height: 40 }}
                            minimumValue={0}
                            maximumValue={status.durationMillis || 0}
                            value={status.positionMillis || 0}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor="rgba(255,255,255,0.4)"
                            thumbTintColor="white"
                            onSlidingComplete={(value) => {
                                videoRef.current?.setPositionAsync(value);
                                resetControlsTimeout();
                            }}
                        />
                    </View>
                </>
            )}

            <TouchableOpacity
                style={styles.muteButtonContainer}
                activeOpacity={0.7}
                onPress={toggleMute}
            >
                <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={16}
                    color="white"
                />
            </TouchableOpacity>
        </View>
    );
}
