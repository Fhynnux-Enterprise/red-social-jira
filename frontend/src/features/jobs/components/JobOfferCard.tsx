
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, Modal, ActivityIndicator, KeyboardAvoidingView, TextInput, Alert, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useApolloClient } from '@apollo/client/react';
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
import { GET_OR_CREATE_CHAT } from '../../chat/graphql/chat.operations';
import { Linking } from 'react-native';
import { DIRECT_MODERATE_CONTENT } from '../../moderation/graphql/moderation.operations';
import Toast from 'react-native-toast-message';

interface JobOfferCardProps {
    item: any;
    onPress?: () => void;
    /** Llama a este callback para pasar el item al padre cuando el usuario quiere editar */
    onEdit?: (item: any) => void;
    isModalView?: boolean;
    onToggleSave?: (item: any) => void;
    showTopDivider?: boolean;
    hideAuthorRow?: boolean;
    isFocused?: boolean;
    isViewable?: boolean;
    isOverlayActive?: boolean;
}

export default function JobOfferCard({ 
    item, onPress, onEdit, hideAuthorRow, isModalView, 
    onToggleSave, isSaved: propIsSaved, showTopDivider,
    isFocused = true, isViewable = true, isOverlayActive = false 
}: JobOfferCardProps) {
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
        onCompleted: (_, clientOptions) => {
            // Evict the deleted item from all Apollo caches instantly
            const deletedId = clientOptions?.variables?.id;
            if (deletedId) {
                client.cache.evict({ id: client.cache.identify({ __typename: 'JobOffer', id: deletedId }) });
                client.cache.gc();
            }
            setConfirmDeleteVisible(false);
            setTimeout(() => Toast.show({
                type: 'success',
                text1: 'Oferta eliminada',
                text2: 'La oferta fue eliminada exitosamente.',
            }), 400);
        },
        onError: (err) => {
            setConfirmDeleteVisible(false);
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

    const handleWhatsApp = async () => {
        if (!item.contactPhone) {
            Alert.alert('Información', 'Este ofertante no proporcionó un número de WhatsApp.');
            return;
        }
        const rawPhone = item.contactPhone.replace(/\s+/g, '').replace(/[^+\d]/g, '');
        const message = `Hola, me interesa tu oferta de empleo: *${item.title}* en Cantón.`;
        const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'No se pudo abrir WhatsApp. Asegúrate de tener la app instalada.');
            }
        } catch (error) {
            Alert.alert('Error', 'Ocurrió un error al intentar abrir WhatsApp.');
        }
    };

    const [getOrCreateChat] = useMutation(GET_OR_CREATE_CHAT);

    const handlePrivateMessage = async () => {
        if (!authContext?.user?.id) {
            Alert.alert('Inicia sesión', 'Debes iniciar sesión para enviar mensajes privados.');
            return;
        }
        if (isOwner) {
            Alert.alert('Información', 'No puedes enviarte un mensaje a ti mismo.');
            return;
        }
        try {
            const { data } = await getOrCreateChat({
                variables: { targetUserId: item.author.id }
            });
            if (data?.getOrCreateOneOnOneChat?.id) {
                router.push({
                    pathname: '/chatRoom',
                    params: { conversationId: data.getOrCreateOneOnOneChat.id }
                });
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo abrir el chat privado.');
        }
    };

    const displayIsSaved = propIsSaved ?? item.isSaved;

    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const [cardWidth, setCardWidth] = React.useState(Dimensions.get('window').width - 32);
    const [activeIndex, setActiveIndex] = useState(0);
    const carouselRef = React.useRef<any>(null);

    const isVideo = item.media && item.media[0]?.type?.toLowerCase() === 'video';
    const topRowY = 12;
    const expandTop = 100;
    const muteTop = isModalView ? (expandTop + 44) : 56;
    const typeTop = isModalView ? (isVideo ? (muteTop + 44) : (expandTop + 44)) : (isVideo ? (muteTop + 44) : 56);

    return (
        <>
            {showTopDivider && (
                <View style={[styles.fullWidthDivider, { marginTop: 0, marginBottom: 12 }]} />
            )}

            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={onPress}
                onLongPress={() => setIsCopyModalVisible(true)}
                delayLongPress={250}
                activeOpacity={1}
                onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            >
                {/* ── Card Head ── */}
                <View style={styles.cardHead}>
                    <View style={[styles.typeBadgeHead, { backgroundColor: '#2196F315' }]}>
                        <Ionicons name="briefcase" size={12} color="#2196F3" />
                        <Text style={[styles.typeBadgeTextHead, { color: '#2196F3' }]}>OFERTA DE EMPLEO</Text>
                    </View>
                </View>

                <View style={styles.mediaContainer}>
                    {item.media && item.media.length > 0 ? (
                        <ImageCarousel
                            ref={carouselRef}
                            media={item.media}
                            containerWidth={cardWidth}
                            customAspectRatio={0.8}
                            disableFullscreen={!!onPress && !isModalView}
                            onPress={onPress}
                            onIndexChange={setActiveIndex}
                            muteButtonStyle={{ top: muteTop, right: 12 }}
                            isInteractive={isModalView}
                            hideExpand={isModalView}
                            hidePagination={true}
                            isFocused={isFocused}
                            isViewable={isViewable}
                            isOverlayActive={isOverlayActive}
                            overlay={
                                <View style={styles.bottomActionStrip}>
                                    {/* 1. Integrated Counter */}
                                    {item.media && item.media.length > 1 && (
                                        <View style={styles.integratedCounter}>
                                            <Text style={styles.integratedCounterText}>
                                                {activeIndex + 1} / {item.media.length}
                                            </Text>
                                        </View>
                                    )}

                                    {/* 2. Botones de contacto (Estilo Unificado) */}
                                    <View style={styles.contactButtonsRow}>
                                        {/* WhatsApp */}
                                        {!!item.contactPhone && (
                                            <TouchableOpacity
                                                style={[styles.contactBtnTransparent, styles.whatsappBtnTransparent]}
                                                onPress={handleWhatsApp}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                                                <Text style={[styles.contactBtnTextOverlay, { color: '#25D366' }]}>WhatsApp</Text>
                                            </TouchableOpacity>
                                        )}
                                        {/* Chat */}
                                        <TouchableOpacity
                                            style={[styles.contactBtnTransparent, styles.privateMessageBtnTransparent]}
                                            onPress={handlePrivateMessage}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="chatbubble-ellipses" size={16} color="#2196F3" />
                                            <Text style={[styles.contactBtnTextOverlay, { color: '#2196F3' }]}>Mensaje Privado</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            }
                        />
                    ) : (
                        <View style={[styles.noImage, { height: 350, backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
                            <Ionicons name="briefcase-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                        </View>
                    )}

                    {/* Author Overlay (Top Leftish) */}
                    {!hideAuthorRow && (
                        <TouchableOpacity 
                            style={styles.sellerOverlay}
                            onPress={goToProfile}
                        >
                            <View style={styles.avatarMiniOverlay}>
                                {item.author?.photoUrl ? (
                                    <Image source={{ uri: item.author.photoUrl }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={{ color: '#FFF', fontSize: 10 }}>{item.author?.firstName?.[0]}</Text>
                                )}
                            </View>
                            <View style={styles.sellerTextColumn}>
                                <Text style={styles.sellerNameOverlay} numberOfLines={1}>
                                    {item.author?.firstName} {item.author?.lastName}
                                </Text>
                                <Text style={styles.sellerNicknameOverlay} numberOfLines={1}>
                                    @{item.author?.username || 'usuario'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}


                    {/* Menu Button Overlay (Top Right) */}
                    {!isModalView && (
                        <View style={styles.topRightActions}>
                            <TouchableOpacity 
                                style={styles.glassCircleHeader} 
                                onPress={() => setMenuVisible(true)}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Content Section below image */}
                <View style={styles.contentPaddingPro}>
                    <View style={styles.proHeaderGrid}>
                        <View style={styles.proTitleCol}>
                            <Text style={[styles.proTitle, { color: colors.text }]} numberOfLines={2}>
                                {item.title}
                            </Text>
                            <View style={styles.proLocationRow}>
                                <Ionicons name="location-sharp" size={12} color={colors.textSecondary} />
                                <Text style={[styles.proLocation, { color: colors.textSecondary }]}>
                                    {item.location}
                                </Text>
                            </View>
                        </View>

                        {item.salary && (
                            <View style={styles.proInfoCol}>
                                <Text style={styles.proPriceGreen}>
                                    Sueldo: ${item.salary.replace(/\$/g, '')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text 
                        style={[styles.proDescription, { color: colors.textSecondary }]} 
                        numberOfLines={isDescExpanded ? undefined : 3}
                    >
                        {item.description}
                    </Text>

                    {item.description.length > 100 && (
                        <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)} style={{ marginTop: 8 }}>
                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                                {isDescExpanded ? 'Ver menos' : 'Leer más...'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={[styles.dateTextPro, { color: colors.textSecondary }]}>
                        {formatDate(item.createdAt)}
                    </Text>
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
                                
                                {isOwner ? (
                                    <>
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
                                    </>
                                ) : (
                                    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => { setMenuVisible(false); setReportVisible(true); }}>
                                        <View style={[styles.menuItemIcon, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                                            <Ionicons name="flag" size={20} color={colors.text} />
                                        </View>
                                        <Text style={[styles.menuItemTitle, { color: colors.text }]}>Reportar oferta</Text>
                                    </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => { setMenuVisible(false); onToggleSave?.(item); }}>
                                    <View style={[styles.menuItemIcon, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                                        <Ionicons name={displayIsSaved ? "bookmark" : "bookmark-outline"} size={20} color={displayIsSaved ? colors.primary : colors.text} />
                                    </View>
                                    <Text style={[styles.menuItemTitle, { color: displayIsSaved ? colors.primary : colors.text }]}>
                                        {displayIsSaved ? 'Quitar de guardados' : 'Guardar oferta'}
                                    </Text>
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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        marginVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: isDark ? 6 : 3,
            },
        }),
    },
    fullWidthDivider: {
        height: 0.6,
        backgroundColor: '#BDBDBD',
        marginTop: 0, 
        marginBottom: 2, 
        width: '120%', 
        marginLeft: -40, 
        opacity: 0.35,
        zIndex: 10,
        elevation: 5,
    },
    mediaContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000',
    },
    noImage: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: { width: '100%', height: '100%' },
    
    // Content Styles (Store Style)
    cardHead: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
    },
    typeBadgeHead: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 6,
    },
    typeBadgeTextHead: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    contentPaddingPro: {
        padding: 16,
        paddingTop: 8,
    },
    proHeaderGrid: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 4,
    },
    proTitleCol: {
        flex: 1,
        paddingRight: 12,
    },
    proTitle: {
        fontSize: 18,
        fontWeight: '900',
        lineHeight: 22,
        marginBottom: 4,
    },
    proLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    proLocation: {
        fontSize: 13,
        fontWeight: '600',
    },
    proInfoCol: {
        alignItems: 'flex-end',
    },
    proPriceGreen: {
        fontSize: 15,
        fontWeight: '800',
        color: '#4CAF50',
    },
    proDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    dateTextPro: {
        fontSize: 12,
        marginTop: 16,
        opacity: 0.4,
    },

    // Overlay Styles
    sellerOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 6,
        paddingRight: 12,
        borderRadius: 24,
        zIndex: 20,
    },
    avatarMiniOverlay: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        overflow: 'hidden',
    },
    sellerTextColumn: {
        justifyContent: 'center',
    },
    sellerNameOverlay: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        lineHeight: 15,
    },
    sellerNicknameOverlay: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '600',
    },
    conditionOverlayTop: {
        position: 'absolute',
        right: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        zIndex: 20,
    },
    conditionTextPremium: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    topRightActions: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 25,
    },
    glassCircleHeader: {
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        minWidth: 36,
    },

    // Bottom Action Strip (Inside Carousel)
    bottomActionStrip: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingTop: 10,
        paddingBottom: 14,
        alignItems: 'center',
        zIndex: 15,
    },
    integratedCounter: {
        marginBottom: 8,
        backgroundColor: 'transparent',
    },
    integratedCounterText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    contactButtonsRow: {
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 16,
        gap: 12,
    },
    contactBtnTransparent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 38,
        borderRadius: 12,
        borderWidth: 1.5,
        backgroundColor: 'transparent',
        gap: 8,
    },
    contactBtnText: {
        fontWeight: '800',
        fontSize: 13,
        textTransform: 'uppercase',
    },
    contactBtnTextOverlay: {
        fontWeight: '800',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    whatsappBtnTransparent: {
        borderColor: '#25D366',
    },
    privateMessageBtnTransparent: {
        borderColor: '#2196F3',
    },

    // Modals Styles
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    menuSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 12 },
    menuHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    menuTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
    menuItemIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuItemTitle: { fontSize: 16, fontWeight: '600' },
    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    confirmCard: { width: '100%', padding: 24, borderRadius: 24, alignItems: 'center' },
    confirmIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    confirmTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
    confirmMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
    confirmDivider: { width: '100%', height: 1, marginBottom: 24 },
    confirmButtons: { flexDirection: 'row', gap: 12 },
    confirmBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    confirmBtnDanger: { backgroundColor: '#F44336' },
    confirmBtnLabel: { fontWeight: '700', fontSize: 15 },
});
