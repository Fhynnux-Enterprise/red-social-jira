import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface ProfessionalCardProps {
    item: any;
    onPress: () => void;
}

export default function ProfessionalCard({ item, onPress }: ProfessionalCardProps) {
    const { colors, isDark } = useTheme();

    return (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.topRow}>
                <View style={styles.avatarWrap}>
                    {item.user?.photoUrl ? (
                        <Image source={{ uri: item.user.photoUrl }} style={styles.avatarImg} />
                    ) : (
                        <Text style={styles.avatarInitials}>
                            {item.user?.firstName?.[0] || ''}{item.user?.lastName?.[0] || ''}
                        </Text>
                    )}
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.profession, { color: colors.text }]} numberOfLines={1}>
                        {item.profession}
                    </Text>
                    <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{item.user?.username}
                    </Text>
                </View>
                {item.experienceYears && (
                    <View style={[styles.experienceBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.experienceText}>{item.experienceYears} años exp.</Text>
                    </View>
                )}
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                {item.description}
            </Text>

            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.contactBtnText}>Contactar</Text>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    avatarWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255, 101, 36, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 101, 36, 0.3)',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: {
        color: '#FF6524',
        fontSize: 18,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    profession: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 2,
    },
    username: {
        fontSize: 13,
        fontWeight: '500',
    },
    experienceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    experienceText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
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
        paddingVertical: 10,
        borderRadius: 12,
    },
    contactBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
});
