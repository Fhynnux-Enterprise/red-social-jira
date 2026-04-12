import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import ImageCarousel from '../../feed/components/ImageCarousel';

interface ProfessionalCardProps {
    item: any;
    onPress: () => void;
    hideAuthorRow?: boolean;
}

export default function ProfessionalCard({ item, onPress, hideAuthorRow }: ProfessionalCardProps) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const authContext = useAuth() as any;
    const { width: cardWidth } = useWindowDimensions();

    const goToProfile = () => {
        const profileUserId = item.user?.id === authContext?.user?.id ? undefined : item.user?.id;
        (navigation as any).navigate('Profile', { userId: profileUserId });
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {!hideAuthorRow && (
                <TouchableOpacity 
                    style={[styles.postHeader, { borderBottomColor: colors.border }]}
                    onPress={goToProfile}
                    activeOpacity={0.7}
                >
                    <View style={styles.postAvatarWrap}>
                        {item.user?.photoUrl ? (
                            <Image source={{ uri: item.user.photoUrl }} style={styles.postAvatarImg} />
                        ) : (
                            <Text style={styles.postAvatarInitials}>
                                {item.user?.firstName?.charAt(0) || ''}{item.user?.lastName?.charAt(0) || ''}
                            </Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={[styles.postAuthorName, { color: colors.text }]} numberOfLines={1}>
                                {`${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''}`.trim() || 'Usuario'}
                            </Text>
                            <View style={styles.typeBadge}>
                                <Ionicons name="person-circle-outline" size={10} color="#FF6524" style={{ marginRight: 6 }} />
                                <Text style={styles.typeBadgeText}>Servicio Profesional</Text>
                            </View>
                        </View>
                        <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                            {item.user?.username ? `@${item.user.username}` : ''}
                        </Text>
                    </View>
                    {!!item.experienceYears && (
                        <View style={[styles.experienceBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.experienceText}>{item.experienceYears} años exp.</Text>
                        </View>
                    )}
                </TouchableOpacity>
            )}

            <View style={styles.body}>
                <Text style={[styles.profession, { color: colors.text }]} numberOfLines={hideAuthorRow ? 2 : 1}>
                    {item.profession || ''}
                </Text>

                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                    {item.description || ''}
                </Text>
            </View>

            {!!(item.media && item.media.length > 0) && (
                <View style={{ width: '100%', backgroundColor: colors.surface }}>
                    <ImageCarousel
                        media={item.media}
                        containerWidth={cardWidth}
                        customAspectRatio={1}
                        disableFullscreen={true}
                        onPress={onPress}
                    />
                </View>
            )}

            <View style={{ padding: 16, paddingTop: 0 }}>
                <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.contactBtnText}>Contactar</Text>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        marginVertical: 8,
        borderRadius: 16,
        marginHorizontal: 4,
    },
    // ── Header post-style ──
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    postAvatarWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,101,36,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,101,36,0.25)',
    },
    postAvatarImg: { width: '100%', height: '100%' },
    postAvatarInitials: {
        color: '#FF6524',
        fontSize: 14,
        fontWeight: '700',
    },
    postAuthorName: {
        fontSize: 14,
        fontWeight: '700',
    },
    postDate: {
        fontSize: 12,
        marginTop: 1,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,101,36,0.10)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,101,36,0.30)',
    },
    typeBadgeText: {
        color: '#FF6524',
        fontSize: 10,
        fontWeight: '700',
    },
    experienceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    experienceText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    // ── Body ──
    body: {
        paddingTop: 6,
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    profession: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 6,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    contactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginHorizontal: -10,
        borderRadius: 12,
    },
    contactBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
});
