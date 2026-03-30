import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCache } from '../../../hooks/useVideoCache';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

interface ChatBubbleVideoProps {
    url: string;
    width: number;
    height: number;
    onPressFullScreen?: () => void;
}

/**
 * Componente de video para burbujas de chat.
 * Reutiliza el hook useVideoCache para evitar descargas redundantes
 * y mantener el scroll a 60fps.
 * 
 * - SILENCIADO POR DEFECTO (se activa con el primer toque)
 * - SIN AUTO-PLAY (requiere interacción inicial)
 * - Primer toque: Reproduce con Audio / Segundo toque: Pantalla completa
 */
export const ChatBubbleVideo = ({ url, width, height, onPressFullScreen }: ChatBubbleVideoProps) => {
    const { cachedSource } = useVideoCache(url);
    const [isMuted, setIsMuted] = useState(true);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    // Usamos useVideoPlayer de forma estable
    const player = useVideoPlayer(cachedSource || url || '', (p) => {
        p.loop = true;
        p.muted = true;
    });

    // Limpieza explícita del player al desmontar (Android stability)
    useEffect(() => {
        return () => {
            if (player && Platform.OS === 'android') {
                // expo-video se encarga de esto, pero garantizamos que no haya accesos posteriores
            }
        };
    }, [player]);

    const handleInternalPress = () => {
        if (!player) return;

        if (!hasStartedPlaying) {
            // Desenmudecer al reproducir por primera vez
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            player.muted = false;
            setIsMuted(false);
            player.play();
            setHasStartedPlaying(true);
        } else {
            // Si ya está reproduciendo, pausamos la miniatura y abrimos en pantalla completa
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            player.pause();
            if (onPressFullScreen) {
                onPressFullScreen();
            }
        }
    };

    const toggleMute = () => {
        if (player) {
            const newMuted = !isMuted;
            player.muted = newMuted;
            setIsMuted(newMuted);
        }
    };

    if (!cachedSource) {
        return (
            <View style={[styles.loader, { width, height }]}>
                <ActivityIndicator color="#FFF" size="small" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { width, height }]}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleInternalPress}
                style={{ width, height }}
                delayPressIn={0}
            >
                <View pointerEvents="none" style={{ width, height }}>
                    <VideoView
                        player={player}
                        style={{ width, height }}
                        contentFit="cover"
                        nativeControls={false}
                    />
                </View>
                {!hasStartedPlaying && (
                    <View style={styles.playOverlay}>
                        <View style={styles.playIconBg}>
                            <Ionicons name="play" size={24} color="#FFF" />
                        </View>
                    </View>
                )}
            </TouchableOpacity>
            {/* Botón Mute/Unmute */}
            <TouchableOpacity
                style={styles.muteButton}
                onPress={toggleMute}
                activeOpacity={0.7}
            >
                <View style={styles.muteIconBg}>
                    <Ionicons
                        name={isMuted ? 'volume-mute' : 'volume-high'}
                        size={14}
                        color="#FFF"
                    />
                </View>
            </TouchableOpacity>

            {/* Indicador de video (play icon sutil) */}
            <View style={styles.videoIndicator}>
                <Ionicons name="videocam" size={12} color="rgba(255,255,255,0.8)" />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    loader: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    muteButton: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        zIndex: 10,
    },
    muteIconBg: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoIndicator: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    playIconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
