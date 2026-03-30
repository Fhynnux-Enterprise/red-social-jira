import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ActualFullscreenVideoProps {
    url: string;
    isMuted: boolean;
    toggleMute: () => void;
    colors: any;
    insets: any;
    isVisible: boolean;
    onClose: () => void;
}

/**
 * Bloque de reproducción nativo para el modo pantalla completa.
 * Extraído de ImageCarousel para ser reutilizado en toda la aplicación (Feed, Chat, etc).
 */
export const ActualFullscreenVideo = ({ 
    url, isMuted, toggleMute, colors, insets, isVisible, onClose 
}: ActualFullscreenVideoProps) => {
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
        <View style={{ flex: 1 }}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgOpacity }]} />
            <Animated.View style={{ flex: 1, transform: [{ translateY: swipeTranslateY }] }} {...swipePan.panHandlers}>
                {fsPlayer && (
                    <VideoView key={url} player={fsPlayer} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
                )}
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
        </View>
    );
};

const styles = StyleSheet.create({
    centerControl: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    muteButtonContainer: {
        position: 'absolute',
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 30,
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
