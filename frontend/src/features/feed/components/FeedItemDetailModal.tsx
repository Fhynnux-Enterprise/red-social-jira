import React, { useRef, useEffect } from 'react';
import {
    View, StyleSheet, Modal, Animated, PanResponder,
    Dimensions, TouchableOpacity, ScrollView, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedItemDetailModalProps {
    visible: boolean;
    item: any | null;
    onClose: () => void;
}

export default function FeedItemDetailModal({ visible, item, onClose }: FeedItemDetailModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    // Entrada con spring al abrirse
    useEffect(() => {
        if (visible) {
            panY.setValue(SCREEN_HEIGHT);
            Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 14,
            }).start();
        }
    }, [visible]);

    // Hardware back button (Android)
    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            closeWithAnimation();
            return true;
        });
        return () => sub.remove();
    }, [visible]);

    const closeWithAnimation = () => {
        Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 240,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    // Drag para cerrar tirando hacia abajo
    const dragPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
            if (g.dy > 0) panY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
            if (g.dy > SCREEN_HEIGHT * 0.18 || g.vy > 0.7) {
                closeWithAnimation();
            } else {
                Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            }
        },
        onPanResponderTerminate: () => {
            Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        },
    })).current;

    if (!visible || !item) return null;

    const isJobOffer = item.__typename === 'JobOffer';
    const isProfessional = item.__typename === 'ProfessionalProfile';

    // Remap aliases para JobOffer (title/media fueron alias-eados en la query)
    const mappedItem = isJobOffer
        ? { ...item, title: item.jobTitle ?? item.title, media: item.jobMedia ?? item.media }
        : item;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeWithAnimation}>
            {/* Backdrop — toca para cerrar */}
            <TouchableOpacity
                style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)' }]}
                activeOpacity={1}
                onPress={closeWithAnimation}
            />

            {/* Sheet deslizable */}
            <Animated.View
                style={[styles.sheet, { transform: [{ translateY: panY }] }]}
                {...dragPan.panHandlers}
            >
                {/* Handle visual */}
                <View style={[styles.sheetInner, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 8 }}
                        bounces={false}
                    >
                        {isJobOffer && (
                            <JobOfferCard
                                item={mappedItem}
                                onPress={() => {}}
                                // En el contexto del modal no mostramos el menú de edición
                            />
                        )}
                        {isProfessional && (
                            <ProfessionalCard
                                item={mappedItem}
                                onPress={() => {}}
                            />
                        )}
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        // Máxima altura del 90% de pantalla para publicaciones largas
        maxHeight: SCREEN_HEIGHT * 0.9,
    },
    sheetInner: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 0,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
});
