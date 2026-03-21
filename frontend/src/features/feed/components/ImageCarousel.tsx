import React, { useState } from 'react';
import { View, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, Modal, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ZoomableImageViewer from './ZoomableImageViewer';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../../../components/CustomToast';

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
}

export default function ImageCarousel({ media, onPress, containerWidth, imageResizeMode = 'cover', customAspectRatio, disableFullscreen = false, dynamicAspectRatio = false }: ImageCarouselProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [activeIndex, setActiveIndex] = useState(0);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
    const [calculatedAspect, setCalculatedAspect] = useState<number | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);

    React.useEffect(() => {
        if (!viewerVisible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            setViewerVisible(false);
            return true;
        });
        return () => sub.remove();
    }, [viewerVisible]);

    React.useEffect(() => {
        if (dynamicAspectRatio && media && media.length > 0 && media[0].type !== 'video') {
            Image.getSize(media[0].url, (width, height) => {
                if (height > 0) {
                    setCalculatedAspect(Math.max(0.65, width / height));
                }
            }, () => {
                // Ignore errors
            });
        }
    }, [dynamicAspectRatio, media]);

    const activeAspectRatio = dynamicAspectRatio && calculatedAspect ? calculatedAspect : (customAspectRatio || (4/5));

    const ITEM_WIDTH = containerWidth || (SCREEN_WIDTH - 24); // Assuming margins are 12 left and 12 right on PostCard

    // Prevent rendering if empty
    if (!media || media.length === 0) return null;

    const handlePress = (index: number) => {
        if (!disableFullscreen) {
            setViewerInitialIndex(index);
            setViewerVisible(true);
        } else if (onPress) {
            onPress();
        }
    };

    const renderItem = ({ item, index }: { item: MediaItem, index: number }) => (
        <TouchableOpacity activeOpacity={0.9} onPress={() => handlePress(index)}>
            <View style={[styles.mediaContainer, { width: ITEM_WIDTH, aspectRatio: activeAspectRatio }]}>
                {item.type === 'video' ? (
                    <View style={[styles.mediaItem, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }]}>
                        <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.8)" style={{ position: 'absolute', zIndex: 10 }} />
                        <Image source={{ uri: item.url }} style={styles.mediaItem} />
                    </View>
                ) : (
                    <Image source={{ uri: item.url }} style={[styles.mediaItem, { backgroundColor: colors.surface }]} resizeMode={imageResizeMode} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={media}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.url}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                    const newIndex = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
                    setActiveIndex(newIndex);
                }}
            />
            {media.length > 1 && (
                <View style={styles.pagination}>
                    {media.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: index === activeIndex ? colors.primary : 'rgba(255,255,255,0.5)' }
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Modal de Pantalla Completa para ver las fotos/videos */}
            <Modal visible={viewerVisible} transparent={true} animationType="fade" onRequestClose={() => setViewerVisible(false)}>
                <View style={styles.viewerContainer}>
                    <TouchableOpacity style={[styles.closeViewerButton, { top: insets.top + 10 }]} onPress={() => setViewerVisible(false)}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>

                    <FlatList
                        data={media}
                        horizontal
                        pagingEnabled
                        scrollEnabled={!isZoomed}
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={viewerInitialIndex}
                        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                        keyExtractor={(item, index) => `viewer-${item.url}-${index}`}
                        renderItem={({ item }) => (
                            <View style={[styles.viewerSlide, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
                                {item.type === 'video' ? (
                                    <View style={[styles.viewerSlide, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
                                        <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.8)" style={{ position: 'absolute', zIndex: 10 }} />
                                        <Image source={{ uri: item.url }} style={styles.viewerImage} resizeMode="contain" />
                                    </View>
                                ) : (
                                    <ZoomableImageViewer url={item.url} onClose={() => setViewerVisible(false)} onZoomChange={setIsZoomed} />
                                )}
                            </View>
                        )}
                    />
                </View>
                {/* El Toast debe estar dentro del Modal para ser visible sobre el fondo negro */}
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
        position: 'relative'
    },
    mediaContainer: {
        width: '100%',
    },
    mediaItem: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
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
    viewerImage: {
        width: '100%',
        height: '100%',
    }
});
