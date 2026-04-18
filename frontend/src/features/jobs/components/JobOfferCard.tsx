
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, Modal, ActivityIndicator, KeyboardAvoidingView, TextInput, Alert, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import ApplyJobModal from './ApplyJobModal';
import ImageCarousel from '../../feed/components/ImageCarousel';
import ReportModal from '../../reports/components/ReportModal';
import CopyTextModal from '../../../components/CopyTextModal';
import {
    DELETE_JOB_OFFER,
    GET_JOB_OFFERS,
    GET_MY_JOB_OFFERS,
    GET_MY_APPLICATIONS,
} from '../graphql/jobs.operations';
import { DIRECT_MODERATE_CONTENT } from '../../moderation/graphql/moderation.operations';
import { useApolloClient } from '@apollo/client/react';
import Toast from 'react-native-toast-message';

interface JobOfferCardProps {
    item: any;
    onPress?: () => void;
    /** Llama a este callback para pasar el item al padre cuando el usuario quiere editar */
    onEdit?: (item: any) => void;
    isModalView?: boolean;
}

export default function JobOfferCard({ item, onPress, onEdit, hideAuthorRow, isModalView }: JobOfferCardProps & { hideAuthorRow?: boolean }) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const authContext = useAuth() as any;
    const [applyVisible, setApplyVisible] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);

    const isModeratorOrAdmin = authContext?.user?.role === 'ADMIN' || authContext?.user?.role === 'MODERATOR';
    const client = useApolloClient();

    const isOwner = authContext?.user?.id === item.author?.id;

    const { data: myAppsData } = useQuery(GET_MY_APPLICATIONS, {
        fetchPolicy: 'cache-first', // Use cache first so we don't bombard the server, update on background
        skip: !authContext?.user?.id || isOwner, // Don't query if not logged in or if owner
    });

    const myApplication = myAppsData?.myApplications?.find((app: any) => app.jobOffer?.id === item.id);

    const getStatusColor = (status: string) => {
        if (status === 'ACCEPTED') return '#4CAF50';
        if (status === 'REJECTED') return '#F44336';
        return '#FF9800'; // PENDING
    };

    const getStatusLabel = (status: string) => {
        if (status === 'ACCEPTED') return 'Aceptada';
        if (status === 'REJECTED') return 'Rechazada';
        return 'Pendiente';
    };

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
        const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
        const date = new Date(utcString);
        const hoy = new Date();
        const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (date.toDateString() === hoy.toDateString()) return `Hoy a las ${timeString}`;
        if (date.toDateString() === ayer.toDateString()) return `Ayer a las ${timeString}`;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year} a las ${timeString}`;
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

    const getFullCopyText = () => {
        let text = `${item.title}\n\n`;
        text += `Descripción: ${item.description}\n`;
        text += `Ubicación: ${item.location}\n`;
        if (item.salary) text += `Salario: $${item.salary.replace(/\$/g, '')}\n`;
        if (item.contactPhone) text += `Teléfono: ${item.contactPhone}\n`;
        return text;
    };

    const [cardWidth, setCardWidth] = useState(Dimensions.get('window').width - 32);

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onPress}
                onLongPress={() => setIsCopyModalVisible(true)}
                delayLongPress={250}
                activeOpacity={0.7}
                onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            >
                {/* ── Header estilo Post ── */}
                {!hideAuthorRow && (
                <View style={[styles.postHeader, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'flex-start' }]}>
                    {/* Badge de tipo arriba */}
                    <View style={[styles.typeBadge, { marginBottom: 10 }]}>
                        <Ionicons name="briefcase-outline" size={12} color="#FF6524" style={{ marginRight: 6 }} />
                        <Text style={styles.typeBadgeText}>OFERTA DE EMPLEO</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
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
                            {/* Nombre + fecha */}
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.postAuthorName, { color: colors.text }]} numberOfLines={1}>
                                    {`${item.author?.firstName ?? ''} ${item.author?.lastName ?? ''}`.trim()}
                                </Text>
                                <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                                    {formatDate(item.createdAt)}
                                    {!!item.editedAt && " • Editado"}
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
                        {/* Botón denuncia para no-propietarios */}
                        {!isOwner && (
                            <TouchableOpacity
                                onPress={() => setReportVisible(true)}
                                style={styles.postEllipsis}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                )}

                <View 
                    style={[styles.contentPadding, { paddingBottom: 4, paddingTop: 1 }]}
                >
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
                    {item.description.length > 150 && !isDescExpanded ? (
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            {item.description.slice(0, 150)}
                            <Text style={{ color: colors.primary, fontWeight: 'bold' }} onPress={() => setIsDescExpanded(true)}> ...más</Text>
                        </Text>
                    ) : (
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            {item.description}
                            {item.description.length > 150 && isDescExpanded && (
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }} onPress={() => setIsDescExpanded(false)}> Ver menos.</Text>
                            )}
                        </Text>
                    )}

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
                            disableFullscreen={!!onPress && !isModalView}
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
                    
                    {!isOwner && myApplication ? (
                        <View style={[styles.applyBtn, { backgroundColor: getStatusColor(myApplication.status) + '15', elevation: 0 }]}>
                            <Ionicons name="checkmark-circle" size={18} color={getStatusColor(myApplication.status)} style={{ marginRight: 6 }} />
                            <Text style={[styles.applyBtnText, { color: getStatusColor(myApplication.status) }]}>
                                {getStatusLabel(myApplication.status)}
                            </Text>
                        </View>
                    ) : (!isOwner && (
                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => setApplyVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="paper-plane-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.applyBtnText}>Postularme</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </TouchableOpacity>

            {/* ── Modal postulación ── */}
            <ApplyJobModal
                visible={applyVisible}
                onClose={() => setApplyVisible(false)}
                jobOffer={item}
            />

            {/* ── Menú de opciones (owner) ── */}
            <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)} statusBarTranslucent>
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.menuOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menuSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
                                <View style={[styles.menuHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
                                <Text style={[styles.menuTitle, { color: colors.text }]}>Opciones</Text>
                                
                                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={handleEdit}>
                                    <View style={[styles.menuItemIcon, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                                        <Ionicons name="pencil" size={20} color={colors.text} />
                                    </View>
                                    <Text style={[styles.menuItemTitle, { color: colors.text }]}>Editar oferta</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={handleDelete} disabled={deleting}>
                                    <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                                        {deleting ? <ActivityIndicator size="small" color="#FF3B30" /> : <Ionicons name="trash" size={20} color="#FF3B30" />}
                                    </View>
                                    <Text style={[styles.menuItemTitle, { color: '#FF3B30' }]}>Eliminar oferta</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={[styles.menuItem, { marginTop: 10, borderBottomWidth: 0 }]} onPress={() => setMenuVisible(false)}>
                                    <View style={[styles.menuItemIcon, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                                    </View>
                                    <Text style={[styles.menuItemTitle, { color: colors.textSecondary }]}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ── Modal de confirmación de eliminación ── */}
            <Modal
                visible={confirmDeleteVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmDeleteVisible(false)}
                statusBarTranslucent
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
            <ReportModal
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                reportedItemId={item.id}
                reportedItemType="JOB_OFFER"
                onContentDeleted={() => {
                    client.cache.evict({ id: client.cache.identify({ __typename: 'JobOffer', id: item.id }) });
                    client.cache.gc();
                    setReportVisible(false);
                }}
            />
            <CopyTextModal
                visible={isCopyModalVisible}
                textToCopy={getFullCopyText()}
                onClose={() => setIsCopyModalVisible(false)}
            />
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
        backgroundColor: 'rgba(255,101,36,0.08)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 8,
        alignSelf: 'flex-start',
        borderLeftWidth: 4,
        borderLeftColor: '#FF6524',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    typeBadgeText: {
        color: '#FF6524',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    menuSheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    menuHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    menuItemIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuItemText: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '500',
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
