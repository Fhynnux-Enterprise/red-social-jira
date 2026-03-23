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
            setViewerActiveIndex(index);
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

    const renderItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
        const itemHeight = ITEM_WIDTH / activeAspectRatio;
        return (
            <View style={{ width: ITEM_WIDTH, height: itemHeight, overflow: 'hidden' }}>
                {item.type?.toLowerCase() === 'video' ? (
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
                            <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' }}>
                                {item.type?.toLowerCase() === 'video' ? (
                                    <InteractiveVideoPlayer
                                        url={item.url}
                                        width={SCREEN_WIDTH}
                                        height={SCREEN_HEIGHT}
                                        isMuted={isGlobalMuted}
                                        shouldPlay={viewerActiveIndex === index && viewerVisible}
                                        toggleMute={toggleGlobalMute}
                                        isInteractive={true}
                                        resizeMode={ResizeMode.CONTAIN}
                                        insets={insets}
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
        flex: 1,
        backgroundColor: '#000',
    },
    muteButtonContainer: {
        position: 'absolute',
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 25,
        elevation: 5,
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
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 20,
    },
});

/**
 * Modal de pantalla completa con reproductor 100% personalizado.
 * Sustituye a presentFullscreenPlayer() para mantener el diseño en iOS y Android.
 */
function FullscreenVideoModal({
    url, isMuted, toggleMute, colors, insets, onOpen, onClose
}: {
    url: string;
    isMuted: boolean;
    toggleMute: () => void;
    colors: any;
    insets?: any;
    onOpen: () => Promise<void>;
    onClose: () => void;
}) {
    const [visible, setVisible] = useState(false);
    const [fsStatus, setFsStatus] = useState<any>({});
    const [showFsControls, setShowFsControls] = useState(false);
    const fsVideoRef = useRef<Video>(null);
    const fsControlsTimeout = useRef<any>(null);
    const top = insets?.top ?? 12;
    const bottom = insets?.bottom ?? 0;

    const openFullscreen = async () => {
        await onOpen(); // pausa el video embebido
        setVisible(true);
    };
    const closeFullscreen = async () => {
        await fsVideoRef.current?.pauseAsync();
        setFsStatus({});
        setShowFsControls(false);
        setVisible(false);
        onClose(); // le avisa al padre para que recargue su video
    };

    const resetFsTimeout = () => {
        if (fsControlsTimeout.current) clearTimeout(fsControlsTimeout.current);
        fsControlsTimeout.current = setTimeout(() => setShowFsControls(false), 2500);
    };

    const handleFsPress = async () => {
        if (fsStatus.isPlaying) {
            await fsVideoRef.current?.pauseAsync();
            setShowFsControls(true);
            if (fsControlsTimeout.current) clearTimeout(fsControlsTimeout.current);
        } else {
            await fsVideoRef.current?.playAsync();
            setShowFsControls(false);
        }
    };

    return (
        <>
            {/* Botón Expandir — visible sobre el video */}
            <TouchableOpacity
                style={[styles.muteButtonContainer, { top: (insets?.top ?? 12) + 54 }]}
                activeOpacity={0.7}
                onPress={openFullscreen}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Ionicons name="expand" size={18} color="white" />
            </TouchableOpacity>

            {/* Modal fullscreen personalizado */}
            <Modal
                visible={visible}
                transparent={false}
                animationType="fade"
                onRequestClose={closeFullscreen}
                statusBarTranslucent
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <Video
                        ref={fsVideoRef}
                        source={{ uri: url }}
                        style={StyleSheet.absoluteFill}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                        isMuted={isMuted}
                        shouldPlay={visible} // Solo reproduce cuando el modal está visible
                        useNativeControls={false}
                        onPlaybackStatusUpdate={(s) => {
                            setFsStatus(s);
                            if (s.isLoaded && !s.isPlaying && !showFsControls) setShowFsControls(true);
                        }}
                    />

                    {/* Capa táctil */}
                    <TouchableOpacity activeOpacity={1} onPress={handleFsPress} style={StyleSheet.absoluteFill} />

                    {/* Overlay Play/Pause */}
                    {(showFsControls || !fsStatus.isPlaying) && (
                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
                            <View style={styles.centerControl}>
                                <Ionicons name={fsStatus.isPlaying ? 'pause' : 'play'} size={60} color="white" style={{ marginLeft: fsStatus.isPlaying ? 0 : 6 }} />
                            </View>
                        </View>
                    )}

                    {/* Botón Cerrar */}
                    <TouchableOpacity onPress={closeFullscreen} style={[styles.muteButtonContainer, { top: top + 8 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={20} color="white" />
                    </TouchableOpacity>

                    {/* Botón Mute */}
                    <TouchableOpacity style={[styles.muteButtonContainer, { top: top + 54 }]} activeOpacity={0.7} onPress={toggleMute} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="white" />
                    </TouchableOpacity>

                    {/* Slider */}
                    <View style={[styles.sliderContainer, { bottom: bottom + 24 }]}>
                        <Slider
                            style={{ width: SCREEN_WIDTH - 32, height: 40 }}
                            minimumValue={0}
                            maximumValue={fsStatus.durationMillis || 1}
                            value={fsStatus.positionMillis || 0}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor="rgba(255,255,255,0.3)"
                            thumbTintColor="#FFF"
                            onSlidingComplete={(value) => { fsVideoRef.current?.setPositionAsync(value); resetFsTimeout(); }}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
}

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
    resizeMode = ResizeMode.COVER,
    insets
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
    insets?: any;
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

    const topOffset = insets?.top ?? 12;
    const bottomOffset = insets?.bottom ?? 0;

    return (
        // El contenedor raíz siempre ocupa el espacio completo asignado
        <View style={{ width, height, backgroundColor: '#000', overflow: 'hidden' }}>

            {/* Video ocupa todo el contenedor. resizeMode controla cómo se escala */}
            <Video
                ref={videoRef}
                source={{ uri: url }}
                style={StyleSheet.absoluteFill}
                resizeMode={resizeMode}
                isLooping
                isMuted={isMuted}
                shouldPlay={shouldPlay}
                useNativeControls={false}
                onPlaybackStatusUpdate={(s) => {
                    setStatus(s);
                    if (s.isLoaded && !s.isPlaying && !showControls) {
                        setShowControls(true);
                    }
                }}
            />

            {/* Capa de toque — encima del video, debajo de los controles */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                style={StyleSheet.absoluteFill}
            />

            {/* Overlay central Play/Pause */}
            {isInteractive && (showControls || !status.isPlaying) && (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { justifyContent: 'center', alignItems: 'center' },
                    ]}
                    pointerEvents="none"
                >
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

            {/* Botón Mute — siempre visible */}
            <TouchableOpacity
                style={[styles.muteButtonContainer, { top: topOffset + 8 }]}
                activeOpacity={0.7}
                onPress={toggleMute}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={18}
                    color="white"
                />
            </TouchableOpacity>

            {isInteractive && (
                <>
                    {/* Botón Expandir → abre nuestro Modal personalizado */}
                    <FullscreenVideoModal
                        url={url}
                        isMuted={isMuted}
                        toggleMute={toggleMute}
                        colors={colors}
                        insets={insets}
                        onOpen={async () => {
                            // Solo pausar — no descargar, para poder retomar
                            await videoRef.current?.pauseAsync();
                        }}
                        onClose={() => {
                            // Al volver del fullscreen, recargamos y reproducimos el video embebido
                            videoRef.current?.loadAsync(
                                { uri: url },
                                { shouldPlay: true, isMuted, isLooping: true },
                                false
                            );
                        }}
                    />

                    {/* Slider en la parte inferior */}
                    <View style={[styles.sliderContainer, { bottom: bottomOffset + 16 }]}>
                        <Slider
                            style={{ width: width - 32, height: 40 }}
                            minimumValue={0}
                            maximumValue={status.durationMillis || 1}
                            value={status.positionMillis || 0}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor="rgba(255,255,255,0.3)"
                            thumbTintColor="#FFF"
                            onSlidingComplete={(value) => {
                                videoRef.current?.setPositionAsync(value);
                                resetControlsTimeout();
                            }}
                        />
                    </View>
                </>
            )}
        </View>
    );
}
