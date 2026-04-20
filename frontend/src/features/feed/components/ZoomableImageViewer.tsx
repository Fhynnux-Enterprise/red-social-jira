import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions, Alert, Image as RNImage, Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

import { VideoView, useVideoPlayer } from 'expo-video';
import { useVideoCache } from '../../../hooks/useVideoCache';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedVideoView = Animated.createAnimatedComponent(VideoView);

interface ZoomableImageViewerProps {
    url: string;
    mediaType?: 'image' | 'video';
    onClose: () => void;
    onZoomChange?: (isZoomed: boolean) => void;
}

export default function ZoomableImageViewer({ url, mediaType = 'image', onClose, onZoomChange }: ZoomableImageViewerProps) {
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const scale = useSharedValue(1);
    const focalX = useSharedValue(SCREEN_WIDTH / 2);
    const focalY = useSharedValue(SCREEN_HEIGHT / 2);
    const savedScale = useSharedValue(1);

    const translationX = useSharedValue(0);
    const translationY = useSharedValue(0);
    const savedTranslationX = useSharedValue(0);
    const savedTranslationY = useSharedValue(0);
    const isZoomedState = useSharedValue(false);
    
    const aspectRatio = useSharedValue(SCREEN_WIDTH / SCREEN_HEIGHT);

    useEffect(() => {
        if (mediaType === 'image') {
            RNImage.getSize(url, (width, height) => {
                if (height > 0) {
                    aspectRatio.value = width / height;
                }
            }, () => {});
        }
    }, [url, mediaType]);

    const updateZoomState = (currentScale: number) => {
        'worklet';
        const zoomed = currentScale > 1.05;
        if (zoomed !== isZoomedState.value) {
            isZoomedState.value = zoomed;
            if (onZoomChange) {
                runOnJS(onZoomChange)(zoomed);
            }
        }
    };

    // Pinch Gesture
    const pinchGesture = Gesture.Pinch()
        .onStart((e) => {
            focalX.value = e.focalX;
            focalY.value = e.focalY;
        })
        .onUpdate((e) => {
            scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 3.5);
            updateZoomState(scale.value);
        })
        .onEnd(() => {
            if (scale.value <= 1 || mediaType === 'video') {
                scale.value = withTiming(1, { duration: 250 });
                savedScale.value = 1;
                translationX.value = withTiming(0, { duration: 250 });
                translationY.value = withTiming(0, { duration: 250 });
                focalX.value = SCREEN_WIDTH / 2;
                focalY.value = SCREEN_HEIGHT / 2;
                savedTranslationX.value = 0;
                savedTranslationY.value = 0;
            } else {
                savedScale.value = scale.value;
                savedTranslationX.value = translationX.value;
                savedTranslationY.value = translationY.value;
            }
            updateZoomState(scale.value);
        });

    // Pan Gesture (only when zoomed in)
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                // Calcular tamaño visual real de la imagen contenida en la pantalla
                const visualWidth = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT * aspectRatio.value);
                const visualHeight = Math.min(SCREEN_HEIGHT, SCREEN_WIDTH / aspectRatio.value);
                
                // Los límites de traducción se basan en si la imagen supera la pantalla después del zoom
                const maxTranslateX = Math.max(0, (visualWidth * scale.value - SCREEN_WIDTH) / 2);
                const maxTranslateY = Math.max(0, (visualHeight * scale.value - SCREEN_HEIGHT) / 2);

                translationX.value = Math.min(Math.max(savedTranslationX.value + e.translationX, -maxTranslateX), maxTranslateX);
                translationY.value = Math.min(Math.max(savedTranslationY.value + e.translationY, -maxTranslateY), maxTranslateY);
            } else {
                // Arrastrar hacia arriba o abajo solo si no hay zoom
                translationY.value = e.translationY;
            }
        })
        .onEnd((e) => {
            if (scale.value > 1 && mediaType !== 'video') {
                savedTranslationX.value = translationX.value;
                savedTranslationY.value = translationY.value;
            } else if (scale.value <= 1) {
                // Cerrar si el arrastre vertical supera el umbral
                if (Math.abs(e.translationY) > 100 || Math.abs(e.velocityY) > 800) {
                    const toValue = e.translationY > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT;
                    translationY.value = withTiming(toValue, { duration: 250 }, () => {
                        runOnJS(onClose)();
                    });
                } else {
                    translationY.value = withSpring(0);
                }
            }
        });

    // Double Tap to Reset/Zoom (Solo para imágenes)
    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((e) => {
            if (mediaType === 'video') return; // Los videos no hacen zoom con doble toque

            if (scale.value !== 1) {
                // Reset a estado original con animación suave sin rebote
                scale.value = withTiming(1, { duration: 250 });
                translationX.value = withTiming(0, { duration: 250 });
                translationY.value = withTiming(0, { duration: 250 });
                focalX.value = SCREEN_WIDTH / 2;
                focalY.value = SCREEN_HEIGHT / 2;
                savedScale.value = 1;
                savedTranslationX.value = 0;
                savedTranslationY.value = 0;
                updateZoomState(1);
            } else {
                // Hacer zoom en el punto exacto del toque (doble toque en ese lugar)
                const targetScale = 2.5; // Zoom para mayor inmersión
                
                // Neutralizar el focal point para que las matemáticas de traslación funcionen exacto
                focalX.value = SCREEN_WIDTH / 2;
                focalY.value = SCREEN_HEIGHT / 2;

                // Calcular cuánto debemos mover la imagen para centrar el toque original
                let targetX = -(e.x - SCREEN_WIDTH / 2) * (targetScale - 1);
                let targetY = -(e.y - SCREEN_HEIGHT / 2) * (targetScale - 1);

                // Calcular tamaño visual real de la imagen para respetar márgenes
                const visualWidth = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT * aspectRatio.value);
                const visualHeight = Math.min(SCREEN_HEIGHT, SCREEN_WIDTH / aspectRatio.value);
                
                // Límites exactos
                const maxTranslateX = Math.max(0, (visualWidth * targetScale - SCREEN_WIDTH) / 2);
                const maxTranslateY = Math.max(0, (visualHeight * targetScale - SCREEN_HEIGHT) / 2);

                // Asegurar que el punto de toque no nos empuje fuera de los bordes reales (fondo negro)
                targetX = Math.min(Math.max(targetX, -maxTranslateX), maxTranslateX);
                targetY = Math.min(Math.max(targetY, -maxTranslateY), maxTranslateY);

                // Animar suavemente
                scale.value = withTiming(targetScale, { duration: 300 });
                translationX.value = withTiming(targetX, { duration: 300 });
                translationY.value = withTiming(targetY, { duration: 300 });

                savedScale.value = targetScale;
                savedTranslationX.value = targetX;
                savedTranslationY.value = targetY;
                updateZoomState(targetScale);
            }
        });

    // Long Press to Download
    const handleDownload = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({
                    type: 'info',
                    text1: 'Permiso denegado',
                    text2: 'Necesitamos permiso para guardar fotos.'
                });
                return;
            }

            const fileName = url.split('/').pop() || 'download.jpg';
            const fileUri = ((FileSystem as any).documentDirectory || '') + fileName;

            const downloadRes = await FileSystem.downloadAsync(url, fileUri);
            
            if (downloadRes.status === 200) {
                await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
                Toast.show({
                    type: 'success',
                    text1: 'Éxito',
                    text2: 'Imagen guardada en la galería correctamente.'
                });
            } else {
                throw new Error('Error en la descarga');
            }
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudo guardar la imagen.'
            });
        } finally {
            setIsMenuVisible(false);
        }
    };

    const longPressGesture = Gesture.LongPress()
        .onStart((e) => {
            runOnJS(setIsMenuVisible)(true);
        });

    const { cachedSource } = useVideoCache(mediaType === 'video' ? url : '');
    const player = useVideoPlayer(mediaType === 'video' ? (cachedSource || url) : null, (p) => {
        if (p) {
            p.loop = true;
            p.play();
        }
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translationX.value },
                { translateY: translationY.value },
                { translateX: focalX.value - SCREEN_WIDTH / 2 },
                { translateY: focalY.value - SCREEN_HEIGHT / 2 },
                { scale: scale.value },
                { translateX: -focalX.value + SCREEN_WIDTH / 2 },
                { translateY: -focalY.value + SCREEN_HEIGHT / 2 },
            ],
        };
    });

    const composedGestures = Gesture.Race(
        Gesture.Simultaneous(pinchGesture, panGesture),
        doubleTap,
        longPressGesture
    );

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={composedGestures}>
                <View style={styles.container}>
                    {/* Fondo con desenfoque dinámico para eliminar barras negras */}
                    {mediaType === 'image' && (
                        <RNImage
                            source={{ uri: url }}
                            style={StyleSheet.absoluteFill}
                            blurRadius={Platform.OS === 'ios' ? 40 : 15}
                            resizeMode="cover"
                        />
                    )}
                    {mediaType === 'image' && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                    )}

                    <Animated.View style={[styles.image, animatedStyle]}>
                        {mediaType === 'image' ? (
                            <Animated.Image
                                source={{ uri: url }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        ) : (
                            <AnimatedVideoView
                                player={player}
                                style={styles.image}
                                contentFit="contain"
                                nativeControls={false}
                            />
                        )}
                    </Animated.View>
                </View>
            </GestureDetector>

            {/* Modal de Opciones (Bottom Sheet) */}
            <Modal transparent visible={isMenuVisible} animationType="slide" onRequestClose={() => setIsMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setIsMenuVisible(false)}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.bottomSheetHandle} />
                        <TouchableOpacity style={styles.optionButton} onPress={handleDownload}>
                            <Ionicons name="download-outline" size={24} color="#FFF" style={styles.optionIcon} />
                            <Text style={styles.optionText}>Guardar en la galería</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.optionButton} onPress={() => setIsMenuVisible(false)}>
                            <Ionicons name="flag-outline" size={24} color="#FFF" style={styles.optionIcon} />
                            <Text style={styles.optionText}>Reportar foto</Text>
                        </TouchableOpacity>

                        <View style={styles.cancelContainer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsMenuVisible(false)}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 12,
    },
    bottomSheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#555',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#333',
    },
    optionIcon: {
        marginRight: 16,
    },
    optionText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '500',
    },
    cancelContainer: {
        marginTop: 16,
    },
    cancelButton: {
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    cancelText: {
        color: '#FF453A',
        fontSize: 17,
        fontWeight: '600',
    },
});
