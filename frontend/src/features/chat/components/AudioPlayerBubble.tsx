import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../../theme/ThemeContext';
import { useAudioPlayerStore } from '../store/audioPlayerStore';

interface AudioPlayerBubbleProps {
    audioUrl: string;
    audioDuration?: number;
    isMine: boolean;
    messageTime?: string;
    isRead?: boolean;
    isEdited?: boolean;
}

export const AudioPlayerBubble: React.FC<AudioPlayerBubbleProps> = ({ 
    audioUrl, 
    audioDuration = 0, 
    isMine,
    messageTime,
    isRead,
    isEdited
}) => {
    const { colors } = useTheme();
    const player = useAudioPlayer(audioUrl);
    const status = useAudioPlayerStatus(player);
    const { currentlyPlayingUri, setCurrentlyPlayingUri } = useAudioPlayerStore();
    const [isFinished, setIsFinished] = useState(false);

    // Efecto reactivo para pausa exclusiva (Senior Dev Practice)
    useEffect(() => {
        if (currentlyPlayingUri !== audioUrl && player.playing) {
            player.pause();
        }
    }, [currentlyPlayingUri, audioUrl, player.playing]);

    // Detectar cuando termina para permitir re-play
    useEffect(() => {
        if (status.didJustFinish) {
            setIsFinished(true);
            player.pause();
            player.seekTo(0);
        }
    }, [status.didJustFinish]);

    const handlePlayPause = () => {
        if (player.playing) {
            player.pause();
        } else {
            if (isFinished) {
                player.seekTo(0);
                setIsFinished(false);
            }
            setCurrentlyPlayingUri(audioUrl);
            player.play();
        }
    };

    const formatTime = (seconds: number) => {
        const totalSeconds = Math.floor(seconds);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // La duración total viene del prop o del player si ya cargó
    const totalDuration = audioDuration > 0 ? audioDuration : player.duration;

    return (
        <View style={styles.container}>
            <View style={styles.playerRow}>
                <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                    <Ionicons 
                        name={player.playing ? "pause" : "play"} 
                        size={32} 
                        color={isMine ? '#FFF' : colors.primary} 
                    />
                </TouchableOpacity>

                <View style={styles.sliderContainer}>
                    {/* Frecuencia Visual (Ondas deterministas basadas en el URL) */}
                    <View style={styles.waveformContainer}>
                        {[...Array(22)].map((_, i) => {
                            // Función determinista simple basada en el URL para que cada audio tenga su "huella" única
                            const seed = audioUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const height = 6 + (Math.sin(i * 0.9 + seed) * 10) + (Math.cos(i * 0.4 + seed) * 4);
                            return (
                                <View 
                                    key={i} 
                                    style={[
                                        styles.waveformBar, 
                                        { 
                                            height: Math.abs(height),
                                            backgroundColor: isMine ? '#FFF' : colors.primary,
                                            opacity: (player.currentTime / (totalDuration || 1)) > (i / 22) ? 1 : 0.25
                                        }
                                    ]} 
                                />
                            );
                        })}
                    </View>

                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={totalDuration || 1}
                        value={player.currentTime}
                        onSlidingComplete={(value) => {
                            player.seekTo(value);
                            if (isFinished) setIsFinished(false);
                        }}
                        minimumTrackTintColor="transparent"
                        maximumTrackTintColor="transparent"
                        thumbTintColor={isMine ? '#FFF' : colors.primary}
                    />
                </View>
            </View>

            {/* Footer integrado: Tiempo del audio y Hora del mensaje en la misma línea */}
            <View style={styles.footerRow}>
                <Text style={[styles.timeText, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                    {formatTime(player.currentTime)} / {formatTime(totalDuration)}
                </Text>
                
                <View style={styles.rightFooter}>
                    {isEdited && (
                        <Text style={[styles.metaText, { color: isMine ? 'rgba(255,255,255,0.5)' : colors.textSecondary, fontStyle: 'italic', marginRight: 4 }]}>
                            Editado
                        </Text>
                    )}
                    <Text style={[styles.metaText, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                        {messageTime}
                    </Text>
                    {isMine && (
                        <Ionicons 
                            name="checkmark-done" 
                            size={14} 
                            color={isRead ? "#00E5FF" : "rgba(255,255,255,0.4)"} 
                            style={{ marginLeft: 4 }}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 210,
        paddingTop: 4,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        marginRight: 4,
        zIndex: 10,
    },
    sliderContainer: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        position: 'relative',
    },
    waveformContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    waveformBar: {
        width: 2,
        borderRadius: 1,
    },
    slider: {
        width: '100%',
        height: 40,
        zIndex: 5,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: -4,
        paddingHorizontal: 4,
    },
    rightFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 10,
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
    },
    metaText: {
        fontSize: 11,
    }
});
