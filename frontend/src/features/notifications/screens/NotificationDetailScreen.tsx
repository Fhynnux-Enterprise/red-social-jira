import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';

export default function NotificationDetailScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ title: string; body: string; image?: string; badgeText?: string; createdAt?: string }>();

    const { title, body, image, badgeText, createdAt } = params;
    
    // Dynamic aspect ratio state (defaults to 16:9 widescreen while loading)
    const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

    useEffect(() => {
        if (image) {
            Image.getSize(
                image,
                (width, height) => {
                    if (width && height) {
                        setAspectRatio(width / height);
                    }
                },
                (error) => {
                    console.log('Error getting image dimensions:', error);
                }
            );
        }
    }, [image]);

    const dateObj = createdAt ? new Date(createdAt) : new Date();
    const formattedDate = dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const currentDate = `${formattedDate} - ${formattedTime}`;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]} 
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notificación</Text>
                <View style={styles.headerRightSpacer} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                {/* Meta details (Badge & Date) */}
                <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '1A' }]}>
                        <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                        <Text style={[styles.badgeText, { color: colors.primary }]}>
                            {badgeText ? badgeText.toUpperCase() : 'OFICIAL'}
                        </Text>
                    </View>
                    
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{currentDate}</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]}>{title || 'Sin Título'}</Text>
                
                {/* Styling Accent Bar */}
                <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

                {/* Message Body */}
                <View style={styles.bodyContainer}>
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                        {body || 'Sin contenido de mensaje.'}
                    </Text>
                </View>

                {/* Divider line if image exists */}
                {image && <View style={styles.divider} />}

                {/* Image Section (now at the bottom, dynamically sized) */}
                {image ? (
                    <View style={[
                        styles.imageContainer, 
                        { 
                            aspectRatio: aspectRatio, // dynamic calculated ratio
                            shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.1)', 
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', 
                            borderColor: colors.border 
                        }
                    ]}>
                        <Image 
                            source={{ uri: image }} 
                            style={styles.image} 
                            resizeMode="cover" // 'cover' works perfectly because the container has the exact ratio of the image
                        />
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerRightSpacer: {
        width: 40,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        lineHeight: 32,
        marginBottom: 12,
    },
    accentBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 20,
    },
    imageContainer: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    image: {
        width: '100%',
        height: '100%',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(150, 150, 150, 0.1)',
        marginBottom: 20,
    },
    bodyContainer: {
        width: '100%',
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 25,
        fontWeight: '400',
        textAlign: 'justify',
    },
});
