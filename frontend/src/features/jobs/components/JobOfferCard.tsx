
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Platform,
    Dimensions, Modal, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import ApplyJobModal from './ApplyJobModal';
import ImageCarousel from '../../feed/components/ImageCarousel';
import {
    DELETE_JOB_OFFER,
    GET_JOB_OFFERS,
    GET_MY_JOB_OFFERS,
} from '../graphql/jobs.operations';

interface JobOfferCardProps {
    item: any;
    onPress: () => void;
    /** Llama a este callback para pasar el item al padre cuando el usuario quiere editar */
    onEdit?: (item: any) => void;
}

export default function JobOfferCard({ item, onPress, onEdit, hideAuthorRow }: JobOfferCardProps & { hideAuthorRow?: boolean }) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const authContext = useAuth() as any;
    const [applyVisible, setApplyVisible] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

    const isOwner = authContext?.user?.id === item.author?.id;

    const [deleteJobOffer, { loading: deleting }] = useMutation(DELETE_JOB_OFFER, {
        refetchQueries: [
            { query: GET_JOB_OFFERS, variables: { limit: 20, offset: 0 } },
            { query: GET_MY_JOB_OFFERS },
        ],
        onCompleted: () => setMenuVisible(false),
        onError: (err) => {
            setMenuVisible(false);
            Alert.alert('Error', err.message || 'No se pudo eliminar la oferta.');
        },
    });

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    };

    const goToProfile = () => {
        const profileUserId = item.author?.id === authContext?.user?.id ? undefined : item.author?.id;
        // Navegar usando navigation.navigate para mantener el contexto de AppNavigator
        (navigation as any).navigate('Profile', { userId: profileUserId });
    };

    const handleDelete = () => {
        setMenuVisible(false);
        setTimeout(() => setConfirmDeleteVisible(true), 150);
    };

    const handleEdit = () => {
        setMenuVisible(false);
        if (onEdit) {
            onEdit(item);
        } else {
            router.push({ pathname: '/jobs/create', params: { editId: item.id, editData: JSON.stringify(item) } });
        }
    };

    const [cardWidth, setCardWidth] = useState(Dimensions.get('window').width - 32);

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onPress}
                activeOpacity={0.7}
                onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            >
                {/* ── Header estilo Post ── */}
                {!hideAuthorRow && (
                <View style={[styles.postHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity style={styles.postAuthorRow} onPress={goToProfile} activeOpacity={0.7}>
                        {/* Avatar */}
                        <View style={styles.postAvatar}>
                            {item.author?.photoUrl ? (
                                <Image source={{ uri: item.author.photoUrl }} style={styles.postAvatarImg} />
                            ) : (
                                <Text style={styles.postAvatarInitials}>
                                    {item.author?.firstName?.[0] || ''}{item.author?.lastName?.[0] || ''}
                                </Text>
                            )}
                        </View>
                        {/* Nombre + badge + fecha */}
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <Text style={[styles.postAuthorName, { color: colors.text }]} numberOfLines={1}>
                                    {`${item.author?.firstName ?? ''} ${item.author?.lastName ?? ''}`.trim()}
                                </Text>
                                <View style={styles.typeBadge}>
                                    <Ionicons name="briefcase-outline" size={10} color="#FF6524" style={{ marginRight: 6 }} />
                                    <Text style={styles.typeBadgeText}>Oferta de Empleo</Text>
                                </View>
                            </View>
                            <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                                {formatDate(item.createdAt)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Ellipsis opciones (solo owner) */}
                    {isOwner && (
                        <TouchableOpacity
                            onPress={() => setMenuVisible(true)}
                            style={styles.postEllipsis}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                )}

                <View style={[styles.contentPadding, { paddingBottom: 4, paddingTop: 1 }]}>
                    {/* Título */}
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={hideAuthorRow ? 2 : 1}>
                        {item.title}
                    </Text>

                    {/* Ubicación */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="#FF6524" />
                        <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                            {item.location}
                        </Text>
                    </View>

                    {/* Descripción */}
                    <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.description}
                    </Text>

                    {/* Salario */}
                    {!!item.salary && (
                        <View style={styles.salaryRow}>
                            <Ionicons name="wallet-outline" size={15} color="#4CAF50" />
                            <Text style={[styles.salary, { color: '#4CAF50' }]} numberOfLines={1}>
                                ${item.salary.replace(/\$/g, '')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Carrusel multimedia */}
                {item.media && item.media.length > 0 && (
                    <View style={{ width: '100%', backgroundColor: colors.surface, marginBottom: -8 }}>
                        <ImageCarousel
                            media={item.media}
                            containerWidth={cardWidth}
                            customAspectRatio={1}
                            disableFullscreen={true}
                            onPress={onPress}
                        />
                    </View>
                )}

                {/* Botones de acción al pie de la tarjeta */}
                <View style={styles.applyBtnWrapper}>
                    {isOwner && (
                        <TouchableOpacity
                            style={[styles.viewApplicantsBtn, { marginBottom: 8 }]}
                            onPress={() => router.push(`/jobs/${item.id}/applicants` as any)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="people-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.applyBtnText}>Ver Postulantes</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.applyBtn}
                        onPress={() => setApplyVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="paper-plane-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.applyBtnText}>Postularme</Text>
                    </TouchableOpacity>
                </View>

            </TouchableOpacity>

            {/* ── Modal postulación ── */}
            <ApplyJobModal
                visible={applyVisible}
                onClose={() => setApplyVisible(false)}
                jobOffer={item}
            />

            {/* ── Menú de opciones (owner) ── */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={[styles.menuSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                        {/* Handle */}
                        <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />

                        <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>
                            Opciones de la oferta
                        </Text>

                        {/* Editar */}
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.border }]}
                            onPress={handleEdit}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(255,101,36,0.1)' }]}>
                                <Ionicons name="create-outline" size={20} color="#FF6524" />
                            </View>
                            <View style={styles.menuItemText}>
                                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Editar oferta</Text>
                                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Modifica los datos de tu publicación</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Eliminar */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleDelete}
                            activeOpacity={0.7}
                            disabled={deleting}
                        >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(244,67,54,0.1)' }]}>
                                {deleting
                                    ? <ActivityIndicator size="small" color="#F44336" />
                                    : <Ionicons name="trash-outline" size={20} color="#F44336" />
                                }
                            </View>
                            <View style={styles.menuItemText}>
                                <Text style={[styles.menuItemTitle, { color: '#F44336' }]}>Eliminar oferta</Text>
                                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Esta acción no se puede deshacer</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Cancelar */}
                        <TouchableOpacity
                            style={[styles.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={() => setMenuVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.cancelText, { color: colors.text }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Modal de confirmación de eliminación ── */}
            <Modal
                visible={confirmDeleteVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmDeleteVisible(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.confirmIconCircle}>
                            <Ionicons name="trash" size={30} color="#F44336" />
                        </View>

                        <Text style={[styles.confirmTitle, { color: colors.text }]}>
                            Eliminar oferta
                        </Text>

                        <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                            {'¿Estás seguro de que quieres eliminar '}
                            <Text style={{ fontWeight: '700', color: colors.text }}>"{item.title}"</Text>
                            {'? Esta acción no se puede deshacer.'}
                        </Text>

                        <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                                onPress={() => setConfirmDeleteVisible(false)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.confirmBtnLabel, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmBtn, styles.confirmBtnDanger]}
                                onPress={() => {
                                    setConfirmDeleteVisible(false);
                                    deleteJobOffer({ variables: { id: item.id } });
                                }}
                                activeOpacity={0.8}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="trash-outline" size={17} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={[styles.confirmBtnLabel, { color: '#FFF' }]}>Eliminar</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        marginVertical: 8,
        borderRadius: 16, // Coherencia con PostCard
        marginHorizontal: 4,
    },
    contentPadding: {
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    topBadgeWrapper: {
        width: '100%',
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 2,
    },
    topOutlineBanner: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FF6524',
        position: 'relative',
    },
    topOutlineContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topOutlineText: {
        color: '#FF6524',
        fontSize: 14,
        fontWeight: '700',
    },
    topOutlineEllipsis: {
        position: 'absolute',
        right: 12,
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
    salaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: 12,
        flexShrink: 0,
        maxWidth: Dimensions.get('window').width * 0.35,
    },
    salary: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 4,
        flexShrink: 1,
    },
    salaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },

    // ── Header estilo Post ──
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    postAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    postAvatar: {
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
    postEllipsis: {
        padding: 4,
        marginLeft: 8,
    },

    applyBtnWrapper: {
        paddingTop: 10,
        paddingHorizontal: 2,
    },
    applyBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginBottom: 14,
        borderRadius: 14,
        backgroundColor: '#FF6524',
    },
    viewApplicantsBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#4CAF50',
    },
    applyBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },

    // ── Menú de opciones ──
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        paddingTop: 12,
    },
    menuHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    menuTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 14,
    },
    menuItemIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuItemText: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    menuItemSub: {
        fontSize: 12,
        marginTop: 2,
    },
    cancelBtn: {
        marginTop: 16,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // ── Modal de confirmación ──
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    confirmCard: {
        width: '100%',
        borderRadius: 24,
        paddingTop: 32,
        paddingHorizontal: 24,
        paddingBottom: 24,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
            },
            android: { elevation: 12 },
        }),
    },
    confirmIconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'rgba(244,67,54,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(244,67,54,0.25)',
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 4,
    },
    confirmDivider: {
        width: '100%',
        height: StyleSheet.hairlineWidth,
        marginVertical: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
    },
    confirmBtnDanger: {
        backgroundColor: '#F44336',
    },
    confirmBtnLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
});
