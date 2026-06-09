import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    useWindowDimensions, Linking, Modal, ActivityIndicator, Platform, TouchableWithoutFeedback
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import ImageCarousel from '../../feed/components/ImageCarousel';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import ReportModal from '../../reports/components/ReportModal';
import { TOGGLE_FOLLOW, IS_FOLLOWING } from '../../follows/graphql/follows.operations';
import CopyTextModal from '../../../components/CopyTextModal';
import {
    GET_OR_CREATE_CHAT
} from '../../chat/graphql/chat.operations';
import {
    DELETE_PROFESSIONAL_PROFILE,
    GET_PROFESSIONALS,
    GET_MY_PROFESSIONAL_PROFILE,
} from '../graphql/jobs.operations';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GenerateNotificationFromPostModal } from '../../feed/components/PostOptionsModal';
import VerifiedBadge from '../../../components/VerifiedBadge';

interface ProfessionalCardProps {
    item: any;
    onPress?: () => void;
    hideAuthorRow?: boolean;
    onEdit?: (item: any) => void;
    isModalView?: boolean;
    onToggleSave?: (item: any) => void;
    isSaved?: boolean;
    isFocused?: boolean;
    isViewable?: boolean;
    isOverlayActive?: boolean;
    showTopDivider?: boolean;
    onClose?: () => void;
    onOptionsPress?: () => void;
}

export default function ProfessionalCard({ 
    item, onPress, hideAuthorRow, onEdit, isModalView, 
    onToggleSave, isSaved: propIsSaved, showTopDivider,
    isFocused = true, isViewable = true, isOverlayActive = false,
    onClose, onOptionsPress
}: ProfessionalCardProps) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const router = useRouter();
    const authContext = useAuth() as any;
    const { width: windowWidth } = useWindowDimensions();
    const [cardWidth, setCardWidth] = useState(windowWidth - 32);
    const insets = useSafeAreaInsets();
    const isOwnCard = item.user?.id === authContext?.user?.id;
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [menuVisible, setMenuVisible] = useState(false);
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
    const [showNotificationForm, setShowNotificationForm] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const carouselRef = React.useRef<any>(null);
    const expandTop = 100;
    const muteTop = isModalView ? (expandTop + 44) : 56;
    // Offset for the playback slider when the video is paused
    const hasCounter = item.media && item.media.length > 1;
    const dynamicSliderOffset = isModalView ? (hasCounter ? 58 : 32) : 0;

    const isModeratorOrAdmin = authContext?.user?.role === 'ADMIN' || authContext?.user?.role === 'MODERATOR';
    const client = useApolloClient();

    const [getOrCreateChat] = useMutation(GET_OR_CREATE_CHAT);

    const { data: followData } = useQuery<any>(IS_FOLLOWING, {
        variables: { followingId: item.user?.id },
        skip: !item.user?.id || isOwnCard || !authContext?.user?.id,
        fetchPolicy: 'cache-and-network',
    });
    const isFollowing = followData?.isFollowing || false;

    const [toggleFollow] = useMutation<any>(TOGGLE_FOLLOW, {
        variables: { followingId: item.user?.id },
        optimisticResponse: {
            toggleFollow: true,
        },
        update(cache, { data: { toggleFollow: newValue } }) {
            cache.writeQuery({
                query: IS_FOLLOWING,
                variables: { followingId: item.user?.id },
                data: { isFollowing: newValue },
            });
            cache.modify({
                id: cache.identify({ __typename: 'User', id: item.user?.id }),
                fields: {
                    followersCount(existingCount = 0) {
                        return newValue ? existingCount + 1 : Math.max(0, existingCount - 1);
                    }
                }
            });
        },
    });

    const [deleteProfile, { loading: deleting }] = useMutation(DELETE_PROFESSIONAL_PROFILE, {
        onCompleted: (_, clientOptions) => {
            // Evict the deleted item from all Apollo caches instantly
            const deletedId = clientOptions?.variables?.id;
            if (deletedId) {
                client.cache.evict({ id: client.cache.identify({ __typename: 'ProfessionalProfile', id: deletedId }) });
                client.cache.gc();
            }
            setConfirmDeleteVisible(false);
            setTimeout(() => Toast.show({
                type: 'success',
                text1: 'Servicio eliminado',
                text2: 'El servicio fue eliminado exitosamente.',
            }), 400);
        },
        onError: (err) => {
            setConfirmDeleteVisible(false);
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        },
    });

    const formatDate = (isoString: string) => {
        if (!isoString) return '';
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
        const profileUserId = item.user?.id === authContext?.user?.id ? undefined : item.user?.id;
        (navigation as any).navigate('Profile', { userId: profileUserId });
    };

    const handleEdit = () => {
        setMenuVisible(false);
        if (onEdit) {
            onEdit(item);
        } else {
            router.push({
                pathname: '/jobs/create',
                params: { editId: item.id, editData: JSON.stringify(item), initialTab: 'service' }
            });
        }
    };

    const handleDelete = () => {
        setMenuVisible(false);
        setTimeout(() => setConfirmDeleteVisible(true), 150);
    };

    const getFullCopyText = () => {
        let text = `${item.profession || ''}\n\n`;
        text += `Resumen: ${item.description || ''}\n`;
        if (item.experienceYears) text += `Experiencia: ${item.experienceYears} años\n`;
        if (item.contactPhone) text += `Teléfono: ${item.contactPhone}\n`;
        return text;
    };

    const displayIsSaved = propIsSaved ?? item.isSaved;

    const handlePrivateMessage = async () => {
        if (isOwnCard) return;
        try {
            const { data } = await getOrCreateChat({
                variables: { targetUserId: item.user?.id }
            });
            const conversationId = data.getOrCreateOneOnOneChat.id;
            router.push({
                pathname: '/chatRoom',
                params: { conversationId }
            });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el chat.' });
        }
    };

    const handleWhatsApp = async () => {
        const rawPhone = (item.contactPhone ?? '').replace(/\s+/g, '').replace(/[^+\d]/g, '');
        if (!rawPhone) {
            Toast.show({ type: 'error', text1: 'Sin número', text2: 'Este profesional no proporcionó un número de teléfono.' });
            return;
        }
        const phone = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone;
        const waUrl  = `whatsapp://send?phone=${phone}`;
        const webUrl = `https://wa.me/${phone}`;

        try {
            await Linking.openURL(waUrl);
        } catch {
            try {
                await Linking.openURL(webUrl);
            } catch {
                Toast.show({
                    type: 'error',
                    text1: 'WhatsApp no disponible',
                    text2: 'No se pudo abrir WhatsApp. Verifica que esté instalado.',
                });
            }
        }
    };

    const hasMedia = item.media && item.media.length > 0;

    return (
        <>
            {showTopDivider && (
                <View style={[styles.fullWidthDivider, { marginTop: 0, marginBottom: 12 }]} />
            )}
            <TouchableOpacity
                style={(hasMedia || isModalView) ? styles.cardWithMedia : styles.cardWithoutMedia}
                onPress={onPress}
                onLongPress={() => setIsCopyModalVisible(true)}
                delayLongPress={250}
                activeOpacity={1}
                onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            >
                {/* ── Card Head (Estilo Oferta) ── */}
                <View style={styles.cardHead}>
                    <View style={[styles.typeBadgeHead, { backgroundColor: '#E91E6315' }]}>
                        <Ionicons name="ribbon" size={12} color="#E91E63" />
                        <Text style={[styles.typeBadgeTextHead, { color: '#E91E63' }]}>PERFIL PROFESIONAL</Text>
                    </View>
                </View>

                {/* ── Media con Overlay de Autor (Modern Style) o Vista de Modal sin Media ── */}
                {(hasMedia || isModalView) ? (
                    <View style={styles.mediaWrapper}>
                        {hasMedia ? (
                            <ImageCarousel
                                ref={carouselRef}
                                media={item.media}
                                containerWidth={cardWidth}
                                customAspectRatio={0.8}
                                disableFullscreen={!!onPress && !isModalView}
                                disablePressToFullscreen={true}
                                onPress={onPress}
                                isFocused={isFocused}
                                isViewable={isViewable}
                                isOverlayActive={isOverlayActive}
                                isInteractive={isModalView}
                                onIndexChange={setActiveIndex}
                                hidePagination={true}
                                hideExpand={isModalView}
                                muteButtonStyle={{ top: muteTop, right: 12 }}
                                sliderBottomOffset={dynamicSliderOffset}
                                overlay={
                                    <View style={styles.bottomActionStrip}>
                                        {/* Contador integrado */}
                                        {item.media && item.media.length > 1 && (
                                            <View style={styles.integratedCounter}>
                                                <Text style={styles.integratedCounterText}>
                                                    {activeIndex + 1} / {item.media.length}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Botones de contacto sobre la imagen */}
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
                                <Ionicons name="ribbon-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                            </View>
                        )}

                        {!hideAuthorRow && (
                            <TouchableOpacity
                                style={styles.authorOverlay}
                                onPress={goToProfile}
                                activeOpacity={0.85}
                            >
                                <View style={styles.avatarMini}>
                                    {item.user?.photoUrl ? (
                                        <Image source={{ uri: item.user.photoUrl }} style={styles.postAvatarImg} />
                                    ) : (
                                        <Text style={styles.avatarMiniInitials}>
                                            {item.user?.firstName?.charAt(0) || ''}{item.user?.lastName?.charAt(0) || ''}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.overlayTextCol}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.overlayAuthorName} numberOfLines={1}>
                                            {`${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''}`.trim() || 'Usuario'}
                                        </Text>
                                        {item.user?.verificationType && (
                                            <VerifiedBadge 
                                                size={16} 
                                            />
                                        )}
                                    </View>
                                    {item.user?.username && (
                                        <Text style={styles.overlayNickname} numberOfLines={1}>
                                            @{item.user.username}
                                        </Text>
                                    )}
                                </View>

                                {!isOwnCard && !isFollowing && (
                                    <>
                                        <View style={styles.sellerDivider} />
                                        <TouchableOpacity 
                                            style={styles.followBtnMini} 
                                            onPress={() => {
                                                toggleFollow().catch(err => console.error('Error toggling follow in ProfessionalCard overlay:', err));
                                            }}
                                        >
                                            <Text style={styles.followTextMini}>Seguir</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {/* Botón de Cerrar (Solo en Modal) */}
                        {isModalView && onClose && (
                            <TouchableOpacity 
                                style={[styles.glassCirclePure, { position: 'absolute', top: 12, right: 12, zIndex: 30 }]}
                                onPress={onClose}
                            >
                                <Ionicons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        )}

                        {/* Botón de Opciones (Solo en Modal) */}
                        {isModalView && onOptionsPress && (
                            <TouchableOpacity 
                                style={[styles.glassCirclePure, { position: 'absolute', top: 56, right: 12, zIndex: 30 }]}
                                onPress={onOptionsPress}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color="white" />
                            </TouchableOpacity>
                        )}

                        {/* Botón de Expandir (Solo en Modal) */}
                        {isModalView && hasMedia && (
                            <TouchableOpacity 
                                style={[styles.glassCirclePure, { position: 'absolute', top: expandTop, right: 12, zIndex: 30 }]}
                                onPress={() => carouselRef.current?.openViewer?.(activeIndex)}
                            >
                                <Ionicons name="expand" size={20} color="white" />
                            </TouchableOpacity>
                        )}

                        {/* Botón ⋯ esquina superior derecha */}
                        {!isModalView && (
                            <TouchableOpacity
                                onPress={() => setMenuVisible(true)}
                                style={styles.overlayOptionsBtn}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    /* Header clásico para cuando NO hay media y NO es vista modal */
                    !hideAuthorRow && (
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.authorRow} onPress={goToProfile} activeOpacity={0.75}>
                                <View style={styles.avatarWrap}>
                                    {item.user?.photoUrl ? (
                                        <Image source={{ uri: item.user.photoUrl }} style={styles.postAvatarImg} />
                                    ) : (
                                        <Text style={styles.avatarInitials}>
                                            {item.user?.firstName?.[0] || ''}{item.user?.lastName?.[0] || ''}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                         <Text style={styles.authorName} numberOfLines={1}>
                                             {`${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''}`.trim() || 'Usuario'}
                                         </Text>
                                         {item.user?.verificationType && (
                                             <VerifiedBadge 
                                                 size={16} 
                                             />
                                         )}
                                     </View>
                                    {item.user?.username && (
                                        <Text style={styles.nicknameText}>@{item.user.username}</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {!isOwnCard && !isFollowing && (
                                <TouchableOpacity 
                                    style={styles.followBtnMini} 
                                    onPress={() => {
                                        toggleFollow().catch(err => console.error('Error toggling follow in ProfessionalCard:', err));
                                    }}
                                >
                                    <Text style={styles.followTextMini}>Seguir</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => setMenuVisible(true)}
                                style={styles.moreBtn}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )
                )}

                {/* ── Contenido ── */}
                <View style={styles.body}>
                    <Text style={[styles.profession, { color: colors.text }]} numberOfLines={2}>
                        {item.profession || ''}
                    </Text>

                    {/* Badge de experiencia */}
                    {!!item.experienceYears && (
                        <View style={styles.experienceRow}>
                            <Ionicons name="ribbon" size={14} color={colors.primary} />
                            <Text style={[styles.experienceTextInBody, { color: colors.primary }]}>
                                {item.experienceYears} año{item.experienceYears !== 1 ? 's' : ''} de experiencia
                            </Text>
                        </View>
                    )}

                    {item.description && item.description.length > 150 && !isDescExpanded ? (
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            {item.description.slice(0, 150)}
                            <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => setIsDescExpanded(true)}> ...más</Text>
                        </Text>
                    ) : (
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            {item.description || ''}
                            {item.description && item.description.length > 150 && isDescExpanded && (
                                <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => setIsDescExpanded(false)}> Ver menos.</Text>
                            )}
                        </Text>
                    )}
                </View>

                {/* Fecha al final (fuera de la descripción para mejor lectura) */}
                <Text style={styles.dateTextBottom}>
                    {formatDate(item.createdAt)}
                    {!!item.editedAt && " • Editado"}
                </Text>

            </TouchableOpacity>

            <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)} statusBarTranslucent>
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.menuOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menuSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
                                <View style={[styles.menuHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
                                <Text style={[styles.menuTitle, { color: colors.text }]}>Opciones</Text>
                                
                                {isModeratorOrAdmin && (
                                    <TouchableOpacity 
                                        style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} 
                                        onPress={() => {
                                            setMenuVisible(false);
                                            setShowNotificationForm(true);
                                        }}
                                    >
                                        <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(255, 101, 36, 0.1)' }]}>
                                            <Ionicons name="megaphone" size={20} color="#ff6524" />
                                        </View>
                                        <Text style={[styles.menuItemTitle, { color: '#ff6524', fontWeight: 'bold' }]}>Generar notificación</Text>
                                    </TouchableOpacity>
                                )}

                                {isOwnCard ? (
                                    <>
                                        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={handleEdit}>
                                            <View style={[styles.menuItemIcon, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                                                <Ionicons name="pencil" size={20} color={colors.text} />
                                            </View>
                                            <Text style={[styles.menuItemTitle, { color: colors.text }]}>Editar servicio</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={handleDelete} disabled={deleting}>
                                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                                                {deleting ? <ActivityIndicator size="small" color="#FF3B30" /> : <Ionicons name="trash" size={20} color="#FF3B30" />}
                                            </View>
                                            <Text style={[styles.menuItemTitle, { color: '#FF3B30' }]}>Eliminar servicio</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => { setMenuVisible(false); setReportVisible(true); }}>
                                        <View style={[styles.menuItemIcon, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                                            <Ionicons name="flag" size={20} color={colors.text} />
                                        </View>
                                        <Text style={[styles.menuItemTitle, { color: colors.text }]}>Reportar servicio</Text>
                                    </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => { setMenuVisible(false); onToggleSave?.(item); }}>
                                    <View style={[styles.menuItemIcon, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                                        <Ionicons name={displayIsSaved ? "bookmark" : "bookmark-outline"} size={20} color={displayIsSaved ? colors.primary : colors.text} />
                                    </View>
                                    <Text style={[styles.menuItemTitle, { color: displayIsSaved ? colors.primary : colors.text }]}>
                                        {displayIsSaved ? 'Quitar de guardados' : 'Guardar servicio'}
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
                        <Text style={[styles.confirmTitle, { color: colors.text }]}>Eliminar servicio</Text>
                        <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                            {'¿Estás seguro de que quieres eliminar tu servicio de '}
                            <Text style={{ fontWeight: '700', color: colors.text }}>"{item.profession}"</Text>
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
                                onPress={() => deleteProfile({ variables: { id: item.id } })}
                                disabled={deleting}
                                activeOpacity={0.75}
                            >
                                {deleting
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <Text style={[styles.confirmBtnLabel, { color: '#FFF' }]}>Eliminar</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <ReportModal
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                reportedItemId={item.id}
                reportedItemType="SERVICE"
            />
            <CopyTextModal
                visible={isCopyModalVisible}
                textToCopy={getFullCopyText()}
                onClose={() => setIsCopyModalVisible(false)}
            />

            {showNotificationForm && (
                <GenerateNotificationFromPostModal
                    visible={showNotificationForm}
                    onClose={() => setShowNotificationForm(false)}
                    post={{
                        ...item,
                        title: item.profession || item.title,
                        description: item.description,
                        media: item.media || item.professionalMedia,
                        __typename: 'ProfessionalProfile',
                    }}
                />
            )}
        </>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    cardWithMedia: {
        backgroundColor: colors.surface,
        marginVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        paddingBottom: 4,
        ...Platform.select({
            ios: {
                shadowColor: isDark ? '#000' : '#00000022',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: isDark ? 6 : 3,
            },
        }),
    },
    cardWithoutMedia: {
        backgroundColor: colors.surface,
        marginVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        paddingBottom: 4,
        ...Platform.select({
            ios: {
                shadowColor: isDark ? '#000' : '#00000022',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: isDark ? 6 : 3,
            },
        }),
    },
    // ── Header (solo sin media) ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    authorRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    nicknameText: {
        fontSize: 12,
        color: colors.textSecondary,
        opacity: 0.7,
    },
    moreBtn: {
        padding: 4,
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
    // ── Head Badge Style ──
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
    postAvatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    // ── Media Wrapper & Overlays ──
    mediaWrapper: {
        width: '100%',
        position: 'relative',
        backgroundColor: '#000',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    noImage: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    authorOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        zIndex: 20,
    },
    overlayTextCol: {
        flexDirection: 'column',
        justifyContent: 'center',
        marginLeft: 2,
    },
    avatarMini: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarMiniInitials: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    overlayAuthorName: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        lineHeight: 15,
    },
    overlayNickname: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '600',
    },
    overlayOptionsBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 25,
    },
    glassCirclePure: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTypeBadge: {
        position: 'absolute',
        top: 56,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        zIndex: 20,
    },
    overlayTypeBadgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    // ── Body ──
    body: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },
    profession: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6,
        lineHeight: 24,
    },
    experienceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    experienceTextInBody: {
        fontSize: 13,
        fontWeight: '700',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
    },
    // ── Contacto ──
    contactRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    whatsappBtn: {
        borderColor: '#25D366',
        backgroundColor: 'rgba(37, 211, 102, 0.05)',
    },
    privateMessageBtn: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '08',
    },
    contactBtnText: {
        fontWeight: '700',
        fontSize: 14,
    },
    dateTextBottom: {
        fontSize: 12,
        color: colors.textSecondary,
        paddingHorizontal: 16,
        paddingBottom: 16,
        opacity: 0.5,
        marginTop: 4,
    },
    // ── Overlay Actions (Bottom Strip) ──
    bottomActionStrip: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingTop: 10,
        paddingBottom: 14,
        alignItems: 'center',
        zIndex: 15,
    },
    integratedCounter: {
        marginBottom: 8,
    },
    integratedCounterText: {
        color: '#FFFFFF',
        fontSize: 12,
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
    whatsappBtnTransparent: {
        borderColor: '#25D366',
    },
    privateMessageBtnTransparent: {
        borderColor: '#2196F3',
    },
    contactBtnTextOverlay: {
        fontWeight: '800',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    // ── Modales ──
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    menuSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    menuHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
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
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuItemIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmCard: {
        width: '100%',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
    },
    confirmIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(244,67,54,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 10,
    },
    confirmMessage: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    confirmDivider: {
        width: '100%',
        height: StyleSheet.hairlineWidth,
        marginBottom: 24,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    confirmBtnDanger: {
        backgroundColor: '#F44336',
    },
    confirmBtnLabel: {
        fontWeight: '700',
        fontSize: 15,
    },
    sellerDivider: {
        width: 1,
        height: 18,
        backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
        marginHorizontal: 4,
    },
    followBtnMini: {
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    followTextMini: {
        color: '#2196F3',
        fontSize: 12,
        fontWeight: '800',
    },
});
