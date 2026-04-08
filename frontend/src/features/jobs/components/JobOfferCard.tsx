import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import ApplyJobModal from './ApplyJobModal';

interface JobOfferCardProps {
    item: any;
    onPress: () => void;
}

export default function JobOfferCard({ item, onPress }: JobOfferCardProps) {
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* ── Encabezado: título + fecha ── */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.date, { color: colors.textSecondary }]}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>

                {/* ── Ubicación ── */}
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#FF6524" />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                        {item.location}
                    </Text>
                </View>

                {/* ── Descripción ── */}
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                </Text>

                {/* ── Footer: autor + salario ── */}
                <View style={styles.footer}>
                    <View style={styles.authorRow}>
                        <View style={styles.avatarWrap}>
                            {item.author?.photoUrl ? (
                                <Image source={{ uri: item.author.photoUrl }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarInitials}>
                                    {item.author?.firstName?.[0] || ''}{item.author?.lastName?.[0] || ''}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                            {item.author?.firstName} {item.author?.lastName}
                        </Text>
                    </View>

                    {item.salary && (
                        <Text style={[styles.salary, { color: '#4CAF50' }]}>
                            {item.salary}
                        </Text>
                    )}
                </View>

                {/* ── Botón Postularme ── */}
                <TouchableOpacity
                    style={[styles.applyBtn, { backgroundColor: '#FF6524' }]}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="paper-plane-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.applyBtnText}>Postularme</Text>
                </TouchableOpacity>
            </TouchableOpacity>

            {/* ── Modal de postulación ── */}
            <ApplyJobModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                jobOffer={item}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
            },
            android: { elevation: 3 },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        marginRight: 10,
    },
    date: {
        fontSize: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    locationText: {
        fontSize: 13,
        marginLeft: 4,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,101,36,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: {
        color: '#FF6524',
        fontSize: 10,
        fontWeight: '700',
    },
    authorName: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    salary: {
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 8,
    },
    applyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        borderRadius: 12,
    },
    applyBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
});
