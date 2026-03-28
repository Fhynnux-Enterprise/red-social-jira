import React, { useState } from 'react';
import { StyleSheet, Dimensions, Alert, Image as RNImage, Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZoomableImageViewerProps {
    url: string;
    onClose: () => void;
    onZoomChange?: (isZoomed: boolean) => void;
}

export default function ZoomableImageViewer({ url, onClose, onZoomChange }: ZoomableImageViewerProps) {
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const scale = useSharedValue(1);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);
    const savedScale = useSharedValue(1);

    const translationX = useSharedValue(0);
    const translationY = useSharedValue(0);
    const savedTranslationX = useSharedValue(0);
    const savedTranslationY = useSharedValue(0);

    const isZoomedState = useSharedValue(false);

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
            const clamp = (val: number, min: number, max: number) => { 'worklet'; return Math.min(Math.max(val, min), max); };
            // Tarea 1: Limitar la escala entre 1 y 3.5
            scale.value = clamp(savedScale.value * e.scale, 1, 3.5);
            updateZoomState(scale.value);
        })
        .onEnd(() => {
            if (scale.value <= 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translationX.value = withSpring(0);
                translationY.value = withSpring(0);
                savedTranslationX.value = 0;
                savedTranslationY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
            updateZoomState(scale.value);
        });

    // Pan Gesture (only when zoomed in)
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                const clamp = (val: number, min: number, max: number) => { 'worklet'; return Math.min(Math.max(val, min), max); };
                const maxTranslateX = (SCREEN_WIDTH * scale.value - SCREEN_WIDTH) / 2;
                const maxTranslateY = (SCREEN_HEIGHT * scale.value - SCREEN_HEIGHT) / 2;
                translationX.value = clamp(savedTranslationX.value + e.translationX, -maxTranslateX, maxTranslateX);
                translationY.value = clamp(savedTranslationY.value + e.translationY, -maxTranslateY, maxTranslateY);
            } else {
                // Arrastrar hacia arriba o abajo solo si no hay zoom
                translationY.value = e.translationY;
            }
        })
        .onEnd((e) => {
            if (scale.value > 1) {
                savedTranslationX.value = translationX.value;
                savedTranslationY.value = translationY.value;
            } else {
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

    // Double Tap to Reset/Zoom
    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value !== 1) {
                scale.value = withSpring(1);
                translationX.value = withSpring(0);
                translationY.value = withSpring(0);
                savedScale.value = 1;
                savedTranslationX.value = 0;
                savedTranslationY.value = 0;
            } else {
                scale.value = withSpring(2);
                savedScale.value = 2;
                updateZoomState(2);
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
                <Animated.Image
                    source={{ uri: url }}
                    style={[styles.image, animatedStyle]}
                    resizeMode="contain"
                />
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
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
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
