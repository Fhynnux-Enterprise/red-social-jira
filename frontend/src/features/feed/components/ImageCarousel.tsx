import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, Image, StyleSheet, Dimensions, FlatList,
    TouchableOpacity, Modal, BackHandler, PanResponder, Animated,
    Pressable, ActivityIndicator
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ZoomableImageViewer from './ZoomableImageViewer';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../../../components/CustomToast';

import { useMute } from '../../../contexts/MuteContext';
import { useVideoCache } from '../../../hooks/useVideoCache';

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

    // ── GESTO SWIPE-TO-CLOSE para el VISOR ──
    const viewerTranslateY = useRef(new Animated.Value(0)).current;
    const viewerPan = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => 
            !isZoomed && Math.abs(g.dy) > 15 && Math.abs(g.dy) > Math.abs(g.dx) * 2,
        onPanResponderMove: (_, g) => viewerTranslateY.setValue(g.dy),
        onPanResponderRelease: (_, g) => {
            if (Math.abs(g.dy) > 120 || Math.abs(g.vy) > 0.8) {
                Animated.timing(viewerTranslateY, {
                    toValue: g.dy > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true
                }).start(() => {
                    setViewerVisible(false);
                });
            } else {
                Animated.spring(viewerTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            }
        },
        onPanResponderTerminate: () => Animated.spring(viewerTranslateY, { toValue: 0, useNativeDriver: true }).start(),
    })).current;

    const viewerBgOpacity = viewerTranslateY.interpolate({
        inputRange: [-SCREEN_HEIGHT, 0, SCREEN_HEIGHT],
        outputRange: [0, 1, 0]
    });

    const viewerScale = viewerTranslateY.interpolate({
        inputRange: [-SCREEN_HEIGHT, 0, SCREEN_HEIGHT],
        outputRange: [0.92, 1, 0.92],
        extrapolate: 'clamp'
    });

    // ── Press ──
    const handleMainPress = useCallback((index: number) => {
        if (!disableFullscreen) {
            viewerTranslateY.setValue(0);
            setViewerInitialIndex(index);
            setViewerActiveIndex(index);
            setViewerVisible(true);
        } else {
            onPress?.();
        }
    }, [disableFullscreen, onPress, viewerTranslateY]);

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
                        shouldPlay={isViewable && isFocused && activeIndex === index && !isOverlayActive && !viewerVisible}
                        toggleMute={toggleGlobalMute}
                        isInteractive={isInteractive}
                        onExpand={() => handleMainPress(index)}
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
    }, [ITEM_WIDTH, activeAspectRatio, colors, handleMainPress, activeIndex, isGlobalMuted, isViewable, isFocused, toggleGlobalMute, isOverlayActive, isInteractive, viewerVisible]);


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
                            extraData={activeIndex}
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
            <Modal visible={viewerVisible} transparent animationType="none"
                onRequestClose={() => setViewerVisible(false)}
            >
                <Animated.View style={[styles.viewerContainer, { opacity: viewerBgOpacity }]}>
                    <TouchableOpacity
                        style={[styles.closeViewerButton, { top: insets.top + 40 }]}
                        onPress={() => setViewerVisible(false)}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>

                    {/* Botón Mute Dinámico en el Visor */}
                    {sortedMedia[viewerActiveIndex]?.type?.toLowerCase() === 'video' && (
                        <TouchableOpacity
                            style={[styles.closeViewerButton, { top: insets.top + 90 }]}
                            onPress={toggleGlobalMute}
                            activeOpacity={0.7}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Ionicons 
                                name={isGlobalMuted ? 'volume-mute' : 'volume-high'} 
                                size={24} 
                                color="#FFF" 
                            />
                        </TouchableOpacity>
                    )}

                    <Animated.View 
                        style={{ flex: 1, transform: [{ translateY: viewerTranslateY }, { scale: viewerScale }] }}
                        {...viewerPan.panHandlers}
                    >
                        <FlatList
                            data={sortedMedia}
                            horizontal
                            pagingEnabled
                            scrollEnabled={!isZoomed}
                            showsHorizontalScrollIndicator={false}
                            extraData={viewerActiveIndex}
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
                                <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: 'transparent' }}>
                                    {item.type?.toLowerCase() === 'video' ? (
                                        <InteractiveVideoPlayer
                                            url={item.url}
                                            width={SCREEN_WIDTH}
                                            height={SCREEN_HEIGHT}
                                            isMuted={isGlobalMuted}
                                            shouldPlay={viewerActiveIndex === index && viewerVisible}
                                            toggleMute={toggleGlobalMute}
                                            isInteractive={true}
                                            hideExpand={true}
                                            contentFit="contain"
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
                    </Animated.View>
                </Animated.View>
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
    timeDisplay: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 25,
    },
    timeText: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});

/**
 * Bloque de reproducción nativo para el modo pantalla completa.
 * Aislado para asegurar que useVideoPlayer reciba una URL válida desde el primer render.
 */
const ActualFullscreenVideo = ({ 
    url, isMuted, toggleMute, colors, insets, isVisible, onClose 
}: any) => {
    const [showFsControls, setShowFsControls] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubPosition, setScrubPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const fsControlsTimeout = useRef<any>(null);
    const top = insets?.top ?? 12;
    const safeBottom = (insets?.bottom ?? 0) + 56;

    const fsPlayer = useVideoPlayer(url, (player: any) => {
        player.loop = true;
        player.muted = isMuted;
        player.play();
    });

    useEffect(() => {
        if (fsPlayer) fsPlayer.muted = isMuted;
    }, [isMuted, fsPlayer]);

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!fsPlayer || !isVisible) return;
        const interval = setInterval(() => {
            if (!isMounted.current) return;
            try {
                if (fsPlayer && typeof fsPlayer === 'object') {
                    const dur = fsPlayer.duration;
                    const pos = fsPlayer.currentTime;
                    const playing = fsPlayer.playing;
                    if (dur) setDuration(dur * 1000);
                    setPosition(pos * 1000);
                    setIsPlaying(playing);
                }
            } catch (e) {}
        }, 250);
        return () => clearInterval(interval);
    }, [fsPlayer, isVisible]);

    const swipeTranslateY = useRef(new Animated.Value(0)).current;
    const swipePan = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderMove: (_, g) => swipeTranslateY.setValue(g.dy),
        onPanResponderRelease: (_, g) => {
            if (Math.abs(g.dy) > 100 || Math.abs(g.vy) > 0.9) {
                Animated.timing(swipeTranslateY, {
                    toValue: g.dy > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT,
                    duration: 220,
                    useNativeDriver: true,
                }).start(() => onClose());
            } else {
                Animated.spring(swipeTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            }
        },
        onPanResponderTerminate: () => Animated.spring(swipeTranslateY, { toValue: 0, useNativeDriver: true }).start(),
    })).current;

    const bgOpacity = swipeTranslateY.interpolate({
        inputRange: [-SCREEN_HEIGHT, 0, SCREEN_HEIGHT],
        outputRange: [0, 1, 0],
    });

    const handleFsPress = () => {
        try {
            if (fsPlayer && typeof fsPlayer.play === 'function') {
                if (fsPlayer.playing) {
                    fsPlayer.pause();
                    setShowFsControls(true);
                    if (fsControlsTimeout.current) clearTimeout(fsControlsTimeout.current);
                } else {
                    fsPlayer.play();
                    setShowFsControls(false);
                }
            }
        } catch (e) {}
    };

    const resetFsTimeout = () => {
        if (fsControlsTimeout.current) clearTimeout(fsControlsTimeout.current);
        fsControlsTimeout.current = setTimeout(() => setShowFsControls(false), 2500);
    };

    return (
        <>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgOpacity }]} />
            <Animated.View style={{ flex: 1, transform: [{ translateY: swipeTranslateY }] }} {...swipePan.panHandlers}>
                <VideoView key={url} player={fsPlayer} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
                <TouchableOpacity activeOpacity={1} onPress={handleFsPress} style={StyleSheet.absoluteFill} />
                {(showFsControls || !isPlaying) && (
                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
                        <View style={styles.centerControl}>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={60} color="white" style={{ marginLeft: isPlaying ? 0 : 6 }} />
                        </View>
                    </View>
                )}
                <TouchableOpacity onPress={() => onClose()} style={[styles.muteButtonContainer, { top: top + 16 }]} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.muteButtonContainer, { top: top + 64 }]} activeOpacity={0.7} onPress={toggleMute} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="white" />
                </TouchableOpacity>
                {isScrubbing && (
                    <View style={styles.timeDisplay} pointerEvents="none">
                        <Text style={styles.timeText}>{Math.floor(scrubPosition/1000/60)}:{(Math.floor(scrubPosition/1000)%60).toString().padStart(2, '0')} / {Math.floor(duration/1000/60)}:{(Math.floor(duration/1000)%60).toString().padStart(2, '0')}</Text>
                    </View>
                )}
                <View style={[styles.sliderContainer, { bottom: safeBottom }]}>
                    <Slider
                        style={{ width: SCREEN_WIDTH - 32, height: 40 }}
                        minimumValue={0}
                        maximumValue={duration || 1}
                        value={isScrubbing ? scrubPosition : position}
                        minimumTrackTintColor={colors.primary}
                        maximumTrackTintColor="rgba(255,255,255,0.3)"
                        thumbTintColor="#FFF"
                        onValueChange={(v) => { setIsScrubbing(true); setScrubPosition(v); }}
                        onSlidingComplete={(v) => {
                            setIsScrubbing(false);
                            if (fsPlayer) fsPlayer.currentTime = v / 1000;
                            resetFsTimeout();
                        }}
                    />
                </View>
            </Animated.View>
        </>
    );
};

/**
 * Modal de pantalla completa con soporte de caché.
 */
const FullscreenVideoModal = React.forwardRef(({
    url, isMuted, toggleMute, colors, insets, onOpen, onClose
}: any, ref) => {
    const [visible, setVisible] = useState(false);
    const { cachedSource } = useVideoCache(visible ? url : '');

    React.useImperativeHandle(ref, () => ({
        open: async () => { await onOpen(); setVisible(true); },
        close: () => setVisible(false)
    }));

    return (
        <Modal visible={visible} transparent={true} animationType="none" onRequestClose={() => setVisible(false)} statusBarTranslucent>
            {cachedSource ? (
                <ActualFullscreenVideo 
                    url={cachedSource} 
                    isMuted={isMuted} 
                    toggleMute={toggleMute} 
                    colors={colors} 
                    insets={insets} 
                    isVisible={visible}
                    onClose={() => { setVisible(false); onClose(); }} 
                />
            ) : (
                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#ff6524" />
                </View>
            )}
        </Modal>
    );
});

/**
 * El REPRODUCTOR REAL que contiene useVideoPlayer.
 * Aislado del hook de caché para evitar Race Conditions.
 */
const ActualVideoPlayer = ({ 
    source, width, height, isMuted, shouldPlay, toggleMute, isInteractive, onExpand, hideExpand, contentFit = 'cover', insets, colors, urlOriginal 
}: any) => {
    const [showControls, setShowControls] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showFullscreenLocal, setShowFullscreenLocal] = useState(false);
    const fsModalRef = useRef<any>(null);
    const controlsTimeout = useRef<any>(null);

    const player = useVideoPlayer(source, (p: any) => {
        p.loop = true;
        p.muted = isMuted;
        if (shouldPlay) p.play();
    });

    useEffect(() => {
        if (!player) return;
        try {
            if (shouldPlay && !showFullscreenLocal) {
                player.play();
            } else {
                player.pause();
                if (player.playing) player.pause();
            }
        } catch (e) {}
    }, [shouldPlay, player, showFullscreenLocal]);

    useEffect(() => {
        if (player) player.muted = isMuted;
    }, [isMuted, player]);

    useEffect(() => {
        const interval = setInterval(() => {
            try {
                if (player && typeof player === 'object') {
                    setIsPlaying(player.playing);
                    setPosition(player.currentTime * 1000);
                    if (player.duration) setDuration(player.duration * 1000);
                }
            } catch (e) {}
        }, 250);
        return () => clearInterval(interval);
    }, [player]);

    const handlePress = () => {
        if (!isInteractive) { onExpand?.(); return; }
        try {
            if (player && typeof player.play === 'function') {
                if (player.playing) {
                    player.pause();
                    setShowControls(true);
                    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
                } else {
                    player.play();
                    setShowControls(false);
                }
            }
        } catch (e) {}
    };

    const bottomOffset = insets?.bottom ?? 0;

    return (
        <View style={{ width, height, backgroundColor: '#000', overflow: 'hidden' }}>
            <VideoView key={source} player={player} style={StyleSheet.absoluteFill} contentFit={contentFit} nativeControls={false} surfaceType="textureView" />
            <TouchableOpacity activeOpacity={1} onPress={handlePress} style={StyleSheet.absoluteFill} />
            
            {isInteractive && (showControls || !isPlaying) && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
                    <View style={styles.centerControl}>
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={50} color="white" style={{ marginLeft: isPlaying ? 0 : 5 }} />
                    </View>
                </View>
            )}

            {!hideExpand && (
                <TouchableOpacity style={[styles.muteButtonContainer, { top: 16, right: 16 }]} activeOpacity={0.7} onPress={toggleMute}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="white" />
                </TouchableOpacity>
            )}

            {isInteractive && (
                <>
                    {!hideExpand && (
                        <TouchableOpacity style={[styles.muteButtonContainer, { top: 60, right: 16 }]} activeOpacity={0.7} onPress={() => {
                            if (onExpand) onExpand(); else fsModalRef.current?.open();
                        }}>
                            <Ionicons name="expand" size={18} color="white" />
                        </TouchableOpacity>
                    )}
                    <FullscreenVideoModal 
                        ref={fsModalRef} url={urlOriginal} isMuted={isMuted} toggleMute={toggleMute} colors={colors} insets={insets} 
                        onOpen={async () => { setShowFullscreenLocal(true); player?.pause(); }} 
                        onClose={() => { setShowFullscreenLocal(false); if (shouldPlay) player?.play(); }} 
                    />
                    <View style={[styles.sliderContainer, { bottom: bottomOffset + 16 }]}>
                        <Slider style={{ width: width - 32, height: 40 }} minimumValue={0} maximumValue={duration || 1} value={position} minimumTrackTintColor={colors.primary} maximumTrackTintColor="rgba(255,255,255,0.3)" thumbTintColor="#FFF" onSlidingComplete={(v) => { if (player) player.currentTime = v / 1000; }} />
                    </View>
                </>
            )}
        </View>
    );
};

/**
 * CONTENEDOR de Video Interactivo con Caché.
 */
export function InteractiveVideoPlayer(props: any) {
    const { cachedSource } = useVideoCache(props.url);
    const { colors } = useTheme();

    if (!cachedSource) {
        return (
            <View style={{ width: props.width, height: props.height, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#ff6524" />
            </View>
        );
    }

    return <ActualVideoPlayer {...props} source={cachedSource} colors={colors} urlOriginal={props.url} />;
}
