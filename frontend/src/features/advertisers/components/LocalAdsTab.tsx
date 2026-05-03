import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_ALL_LOCAL_ADS, TOGGLE_LOCAL_AD, DELETE_LOCAL_AD } from '../graphql/advertisers.operations';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LocalAdMedia {
    id: string;
    url: string;
    type: string;
    thumbnailUrl?: string;
}

interface AdvertiserUser {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
}

interface LocalAd {
    id: string;
    advertiserId: string;
    title: string;
    description: string;
    actionUrl?: string;
    actionLabel: string;
    isActive: boolean;
    views: number;
    clicks: number;
    createdAt: string;
    advertiser: AdvertiserUser;
    media: LocalAdMedia[];
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function LocalAdsTab() {
    const { colors } = useTheme();
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const { data, loading, refetch } = useQuery(GET_ALL_LOCAL_ADS, {
        fetchPolicy: 'network-only',
    });

    const [toggleAd] = useMutation(TOGGLE_LOCAL_AD, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Estado actualizado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const [deleteAd] = useMutation(DELETE_LOCAL_AD, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Anuncio eliminado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const allAds: LocalAd[] = data?.getAllLocalAds ?? [];
    const filteredAds = allAds.filter(ad => {
        if (filter === 'active') return ad.isActive;
        if (filter === 'inactive') return !ad.isActive;
        return true;
    });

    const handleDelete = (ad: LocalAd) => {
        Alert.alert(
            'Eliminar Anuncio',
            `¿Seguro que quieres eliminar "${ad.title}"? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteAd({ variables: { id: ad.id } }),
                },
            ]
        );
    };

    if (loading) {
        return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
    }

    return (
        <View style={{ flex: 1, padding: 20 }}>
            {/* Header */}
            <View style={styles.topRow}>
                <View>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PUBLICACIONES</Text>
                    <Text style={[styles.countBadge, { color: colors.text }]}>
                        {allAds.length} anuncios en total
                    </Text>
                </View>
                {/* Stats pills */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.statPill, { backgroundColor: '#22C55E20' }]}>
                        <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 13 }}>
                            {allAds.filter(a => a.isActive).length} activos
                        </Text>
                    </View>
                    <View style={[styles.statPill, { backgroundColor: '#EF444420' }]}>
                        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>
                            {allAds.filter(a => !a.isActive).length} pausados
                        </Text>
                    </View>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(['all', 'active', 'inactive'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterBtn, filter === f && { backgroundColor: colors.primary }]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.textSecondary }]}>
                            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Pausados'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {filteredAds.length === 0 ? (
                <EmptyState colors={colors} filter={filter} />
            ) : (
                <FlatList
                    data={filteredAds}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    renderItem={({ item }) => (
                        <LocalAdCard
                            ad={item}
                            colors={colors}
                            onToggle={() => toggleAd({ variables: { id: item.id, isActive: !item.isActive } })}
                            onDelete={() => handleDelete(item)}
                        />
                    )}
                />
            )}
        </View>
    );
}

// ─── Tarjeta de Anuncio Local ─────────────────────────────────────────────────

function LocalAdCard({ ad, colors, onToggle, onDelete }: any) {
    const coverImage = ad.media?.find((m: LocalAdMedia) => m.type === 'IMAGE')?.url;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Cover image if available */}
            {coverImage && (
                <Image source={{ uri: coverImage }} style={styles.adCover} resizeMode="cover" />
            )}

            <View style={styles.cardBody}>
                {/* Status + Title */}
                <View style={styles.cardTitleRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.adTitle, { color: colors.text }]} numberOfLines={1}>
                            {ad.title}
                        </Text>
                        <Text style={[styles.adDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                            {ad.description}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusPill,
                        { backgroundColor: ad.isActive ? '#22C55E20' : '#F59E0B20' }
                    ]}>
                        <View style={[styles.statusDot, { backgroundColor: ad.isActive ? '#22C55E' : '#F59E0B' }]} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: ad.isActive ? '#22C55E' : '#F59E0B' }}>
                            {ad.isActive ? 'Activo' : 'Pausado'}
                        </Text>
                    </View>
                </View>

                {/* Advertiser row */}
                <View style={[styles.advertiserRow, { borderTopColor: colors.border }]}>
                    {ad.advertiser.photoUrl ? (
                        <Image source={{ uri: ad.advertiser.photoUrl }} style={styles.miniAvatar} />
                    ) : (
                        <View style={[styles.miniAvatarPlaceholder, { backgroundColor: colors.primary + '22' }]}>
                            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>
                                {ad.advertiser.firstName?.[0]?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.advertiserName, { color: colors.textSecondary }]}>
                        @{ad.advertiser.username}
                    </Text>
                    <View style={{ flex: 1 }} />

                    {/* Stats */}
                    <View style={styles.statItem}>
                        <Ionicons name="eye-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.statNum, { color: colors.textSecondary }]}>{ad.views}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="hand-left-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.statNum, { color: colors.textSecondary }]}>{ad.clicks}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border }]}
                        onPress={onToggle}
                    >
                        <Ionicons
                            name={ad.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                            size={16}
                            color={colors.textSecondary}
                        />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                            {ad.isActive ? 'Pausar' : 'Activar'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#EF444430', backgroundColor: '#EF444408' }]}
                        onPress={onDelete}
                    >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ─── Estado Vacío ─────────────────────────────────────────────────────────────

function EmptyState({ colors, filter }: any) {
    const msg = filter === 'all'
        ? 'No hay anuncios creados por los anunciantes aún.'
        : filter === 'active'
        ? 'No hay anuncios activos actualmente.'
        : 'No hay anuncios pausados actualmente.';

    return (
        <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin anuncios</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{msg}</Text>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
    countBadge: { fontSize: 16, fontWeight: '700', marginTop: 2 },
    statPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    filterRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 16, gap: 4 },
    filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
    filterText: { fontSize: 13, fontWeight: '700' },
    card: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
    adCover: { width: '100%', height: 140 },
    cardBody: { padding: 14 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    adTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    adDesc: { fontSize: 13, lineHeight: 18 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    advertiserRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, marginBottom: 10, borderTopWidth: StyleSheet.hairlineWidth },
    miniAvatar: { width: 24, height: 24, borderRadius: 12 },
    miniAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    advertiserName: { fontSize: 12, fontWeight: '600' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statNum: { fontSize: 12 },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    actionText: { fontSize: 13, fontWeight: '600' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
