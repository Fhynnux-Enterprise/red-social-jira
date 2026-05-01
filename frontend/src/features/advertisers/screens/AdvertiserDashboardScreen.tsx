import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, Image, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import CreateLocalAdModal from '../components/CreateLocalAdModal';
import {
    GET_MY_ADS,
    TOGGLE_LOCAL_AD,
    DELETE_LOCAL_AD,
    UPDATE_LOCAL_AD,
    GET_MY_ADVERTISER_PERMISSION,
} from '../graphql/advertisers.operations';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LocalAdMedia { id: string; url: string; type: string; }
interface LocalAd {
    id: string; title: string; description: string;
    actionUrl?: string; actionLabel: string;
    isActive: boolean; views: number; clicks: number;
    createdAt: string; media: LocalAdMedia[];
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function AdvertiserDashboardScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAd, setEditingAd] = useState<LocalAd | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<LocalAd | null>(null);

    const { data, loading, refetch } = useQuery(GET_MY_ADS, { fetchPolicy: 'network-only' });

    const [toggleAd] = useMutation(TOGGLE_LOCAL_AD, {
        onCompleted: () => { Toast.show({ type: 'success', text1: 'Estado actualizado' }); refetch(); },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const { data: permData, loading: permLoading, refetch: refetchPerm } = useQuery(GET_MY_ADVERTISER_PERMISSION, {
        fetchPolicy: 'network-only',
    });

    const [deleteAd] = useMutation(DELETE_LOCAL_AD, {
        onCompleted: () => { Toast.show({ type: 'success', text1: 'Anuncio eliminado' }); refetch(); },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const permission = permData?.getMyAdvertiserPermission;

    const ads: LocalAd[] = data?.getMyAds ?? [];
    const activeCount = ads.filter(a => a.isActive).length;
    const totalViews = ads.reduce((acc, a) => acc + a.views, 0);
    const totalClicks = ads.reduce((acc, a) => acc + a.clicks, 0);

    const handleDelete = (ad: LocalAd) => {
        setConfirmDelete(ad);
    };

    const onConfirmDelete = () => {
        if (confirmDelete) {
            deleteAd({ variables: { id: confirmDelete.id } });
            setConfirmDelete(null);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Anuncios</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Panel de anunciante</Text>
                </View>
                <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.createBtnText}>Crear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                {/* Global Campaign Banner */}
                {permission && (
                    <CampaignBanner 
                        expiresAt={permission.expiresAt} 
                        colors={colors} 
                        currentAds={data?.getMyAds?.length || 0}
                        maxAds={permission.maxAds}
                    />
                )}

                {/* Stats cards */}
                <View style={styles.statsRow}>
                    <StatCard label="Activos" value={activeCount} icon="megaphone" color="#22C55E" colors={colors} />
                    <StatCard label="Vistas" value={totalViews} icon="eye" color="#6366F1" colors={colors} />
                    <StatCard label="Clics" value={totalClicks} icon="hand-left" color="#F59E0B" colors={colors} />
                </View>

                {/* Ads list */}
                <View style={styles.listSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tus publicaciones</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : ads.length === 0 ? (
                        <EmptyAds colors={colors} onCreate={() => setShowCreateModal(true)} />
                    ) : (
                        ads.map((ad) => (
                            <MyAdCard
                                key={ad.id}
                                ad={ad}
                                colors={colors}
                                isDark={isDark}
                                onToggle={() => toggleAd({ variables: { id: ad.id, isActive: !ad.isActive } })}
                                onDelete={() => handleDelete(ad)}
                                onEdit={() => setEditingAd(ad)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            <CreateLocalAdModal 
                visible={showCreateModal || !!editingAd} 
                ad={editingAd}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingAd(null);
                }} 
                onSuccess={() => { 
                    setShowCreateModal(false); 
                    setEditingAd(null);
                    refetch(); 
                }}
            />

            <CustomConfirmDialog
                visible={!!confirmDelete}
                title="Eliminar Anuncio"
                message={`¿Estás seguro de que quieres eliminar "${confirmDelete?.title}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                onCancel={() => setConfirmDelete(null)}
                onConfirm={onConfirmDelete}
                colors={colors}
                isDestructive
            />
        </SafeAreaView>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, colors }: any) {
    return (
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
    );
}

// ─── Helper Tiempo Restante ──────────────────────────────────────────────────

function getTimeRemaining(expiresAt?: string) {
    if (!expiresAt) return null;
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return { label: 'Campaña finalizada', isExpired: true };

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 1) return { label: `Quedan ${days} días`, isWarning: days <= 3 };
    if (days === 1) return { label: `Queda 1 día`, isWarning: true };
    if (hours > 0) return { label: `Quedan ${hours} hora${hours > 1 ? 's' : ''}`, isWarning: true };
    return { label: `Queda ${minutes} minuto${minutes > 1 ? 's' : ''}`, isWarning: true };
}

function CampaignBanner({ expiresAt, colors, currentAds, maxAds }: any) {
    const time = getTimeRemaining(expiresAt);
    if (!time) return null;

    const adsRemaining = maxAds - currentAds;
    const isAdsWarning = adsRemaining <= 1;

    return (
        <View style={[
            styles.banner, 
            { 
                backgroundColor: time.isWarning ? '#EF444410' : colors.primary + '10',
                borderColor: time.isWarning ? '#EF444430' : colors.primary + '30'
            }
        ]}>
            <View style={[
                styles.bannerIcon, 
                { backgroundColor: time.isWarning ? '#EF444420' : colors.primary + '20' }
            ]}>
                <Ionicons 
                    name={time.isExpired ? "alert-circle" : "calendar"} 
                    size={22} 
                    color={time.isWarning ? '#EF4444' : colors.primary} 
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>
                    Tu campaña publicitaria
                </Text>
                <Text style={[
                    styles.bannerSub, 
                    { color: time.isWarning ? '#EF4444' : colors.textSecondary }
                ]}>
                    {time.label} • Vence el {new Date(expiresAt).toLocaleDateString()} a las {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={[
                    styles.adsCountText,
                    { color: isAdsWarning ? '#EF4444' : colors.primary }
                ]}>
                    Anuncios: {currentAds} de {maxAds} (Te queda{adsRemaining === 1 ? '' : 'n'} {adsRemaining})
                </Text>
            </View>
        </View>
    );
}

// ─── Tarjeta de Anuncio Propio ────────────────────────────────────────────────

function MyAdCard({ ad, colors, isDark, onToggle, onDelete, onEdit }: any) {
    const coverImage = ad.media?.find((m: LocalAdMedia) => m.type === 'IMAGE')?.url;
    const advertiser = ad.advertiser;
    const displayName = advertiser
      ? `${advertiser.firstName ?? ''} ${advertiser.lastName ?? ''}`.trim() || advertiser.username
      : 'Tu Anuncio';

    return (
        <View style={[styles.adCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* ─ Cabecera estilo Feed ─ */}
            <View style={styles.adHeader}>
                <View style={styles.adAuthorInfo}>
                    {advertiser?.photoUrl ? (
                        <Image source={{ uri: advertiser.photoUrl }} style={styles.adAuthorIcon} />
                    ) : (
                        <View style={[styles.adAuthorIconFallback, { backgroundColor: colors.primary }]}>
                            <Ionicons name="megaphone" size={16} color="white" />
                        </View>
                    )}
                    <View style={styles.adAuthorTextBlock}>
                        <Text style={[styles.adAuthorName, { color: colors.text }]} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <View style={styles.adBadge}>
                            <Ionicons name="megaphone" size={9} color="white" />
                            <Text style={styles.adBadgeText}>Publicidad</Text>
                        </View>
                    </View>
                </View>
                {/* ─ Botón de Opciones ─ */}
                <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* ─ Contenido ─ */}
            <View style={styles.adContent}>
                <Text style={[styles.adHeadline, { color: colors.text }]}>{ad.title}</Text>
                <Text style={[styles.adDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                    {ad.description}
                </Text>

                {/* ─ Imagen 3:4 ─ */}
                {coverImage && (
                    <View style={styles.adMediaContainer}>
                        <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </View>
                )}
            </View>

            {/* ─ Footer con CTA ─ */}
            <View style={styles.adFooter}>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {ad.whatsappPhone && (
                        <TouchableOpacity 
                            style={[styles.adCtaButton, { flex: 1, backgroundColor: '#25D366', marginBottom: 0 }]}
                            onPress={() => {
                                const url = `https://wa.me/${ad.whatsappPhone.replace('+', '')}`;
                                import('react-native').then(({ Linking }) => Linking.openURL(url).catch(() => {}));
                            }}
                        >
                            <Text style={styles.adCtaText}>WhatsApp</Text>
                            <Ionicons name="logo-whatsapp" size={16} color="white" />
                        </TouchableOpacity>
                    )}
                    {ad.actionUrl && (
                        <TouchableOpacity 
                            style={[styles.adCtaButton, { flex: 1, backgroundColor: colors.primary, marginBottom: 0 }]}
                            onPress={() => import('react-native').then(({ Linking }) => Linking.openURL(ad.actionUrl).catch(() => {}))}
                        >
                            <Text style={styles.adCtaText}>{ad.actionLabel || 'Ver más'}</Text>
                            <Ionicons name="arrow-forward" size={16} color="white" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Mini stats */}
                <View style={[styles.miniStats, { borderTopColor: colors.border }]}>
                    <View style={styles.miniStat}>
                        <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.miniStatText, { color: colors.textSecondary }]}>{ad.views} vistas</Text>
                    </View>
                    <View style={styles.miniStat}>
                        <Ionicons name="hand-left-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.miniStatText, { color: colors.textSecondary }]}>{ad.clicks} clics</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: ad.isActive ? '#22C55E20' : '#F59E0B20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: ad.isActive ? '#22C55E' : '#F59E0B' }]} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: ad.isActive ? '#22C55E' : '#F59E0B' }}>
                            {ad.isActive ? 'Activo' : 'Pausado'}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.adActions}>
                    <TouchableOpacity style={[styles.adActionBtn, { borderColor: colors.border }]} onPress={onEdit}>
                        <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.adActionText, { color: colors.textSecondary }]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.adActionBtn, { borderColor: colors.border }]} onPress={onToggle}>
                        <Ionicons name={ad.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={colors.textSecondary} />
                        <Text style={[styles.adActionText, { color: colors.textSecondary }]}>{ad.isActive ? 'Pausar' : 'Activar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.adActionBtn, { borderColor: '#EF444430', backgroundColor: '#EF444408' }]} onPress={onDelete}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[styles.adActionText, { color: '#EF4444' }]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ─── Diálogo de Confirmación Personalizado ────────────────────────────────────

function CustomConfirmDialog({ visible, title, message, confirmText, onCancel, onConfirm, colors, isDestructive }: any) {
    if (!visible) return null;
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.alertOverlay}>
                <View style={[styles.alertCard, { backgroundColor: colors.background }]}>
                    <View style={[styles.alertIconWrapper, { backgroundColor: isDestructive ? '#EF444420' : colors.primary + '20' }]}>
                        <Ionicons name={isDestructive ? "trash-outline" : "help-circle-outline"} size={32} color={isDestructive ? "#EF4444" : colors.primary} />
                    </View>
                    <Text style={[styles.alertTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{message}</Text>
                    
                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                        <TouchableOpacity 
                            style={[styles.alertBtn, { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.alertBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.alertBtn, { flex: 1, backgroundColor: isDestructive ? '#EF4444' : colors.primary }]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.alertBtnText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyAds({ colors, onCreate }: any) {
    return (
        <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aún no tienes anuncios</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Crea tu primer anuncio y aparecerá en el feed de la comunidad.
            </Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={onCreate}>
                <Ionicons name="add-circle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Crear mi primer anuncio</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerSub: { fontSize: 12 },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
    createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    // Banner
    banner: { flexDirection: 'row', alignItems: 'center', margin: 20, marginBottom: 0, padding: 16, borderRadius: 20, borderWidth: 1, gap: 14 },
    bannerIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    bannerTitle: { fontSize: 15, fontWeight: '800' },
    bannerSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    adsCountText: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    statsRow: { flexDirection: 'row', padding: 20, gap: 12 },
    statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6 },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 12, fontWeight: '600' },
    listSection: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    adCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, marginBottom: 20, overflow: 'hidden' },
    adHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    adAuthorInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    adAuthorIcon: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    adAuthorIconFallback: { width: 40, height: 40, borderRadius: 20, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    adAuthorTextBlock: { flex: 1 },
    adAuthorName: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
    adBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FF6524', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start' },
    adBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
    adContent: { paddingHorizontal: 16 },
    adHeadline: { fontWeight: '700', fontSize: 16, lineHeight: 22, marginBottom: 6 },
    adDescription: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    adMediaContainer: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    adFooter: { padding: 12, paddingTop: 0 },
    adCtaButton: { borderRadius: 14, height: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, width: '100%', marginBottom: 12 },
    adCtaText: { color: 'white', fontWeight: '800', fontSize: 15 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 'auto' },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    miniStats: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
    miniStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    miniStatText: { fontSize: 12 },
    adActions: { flexDirection: 'row', gap: 10 },
    adActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    adActionText: { fontSize: 13, fontWeight: '600' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
    modalInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
    charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
    createSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, height: 54, borderRadius: 14 },
    createSubmitText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    // Empty
    empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 50, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14, marginTop: 8 },
    // Alert Dialog Styles
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    alertCard: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.34, shadowRadius: 6.27 },
    alertIconWrapper: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    alertTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    alertMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    alertBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
