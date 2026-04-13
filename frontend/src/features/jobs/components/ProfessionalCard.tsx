import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    useWindowDimensions, Linking, Modal, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import ImageCarousel from '../../feed/components/ImageCarousel';
import { useMutation } from '@apollo/client/react';
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

interface ProfessionalCardProps {
    item: any;
    onPress: () => void;
    hideAuthorRow?: boolean;
    onEdit?: (item: any) => void;
}

export default function ProfessionalCard({ item, onPress, hideAuthorRow, onEdit }: ProfessionalCardProps) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const router = useRouter();
    const authContext = useAuth() as any;
    const { width: cardWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isOwnCard = item.user?.id === authContext?.user?.id;

    const [menuVisible, setMenuVisible] = useState(false);
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

    const [getOrCreateChat] = useMutation(GET_OR_CREATE_CHAT);

    const [deleteProfile, { loading: deleting }] = useMutation(DELETE_PROFESSIONAL_PROFILE, {
        refetchQueries: [
            { query: GET_PROFESSIONALS, variables: { limit: 20, offset: 0 } },
            { query: GET_MY_PROFESSIONAL_PROFILE },
        ],
        onCompleted: () => {
            setConfirmDeleteVisible(false);
            Toast.show({ type: 'success', text1: 'Servicio eliminado' });
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

    const handlePrivateMessage = async () => {
        if (isOwnCard) return;
        try {
            const { data } = await getOrCreateChat({
                variables: { targetUserId: item.user?.id }
            });
            const conversationId = data.getOrCreateOneOnOneChat.id;
            (navigation as any).navigate('ChatRoom', { conversationId });
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

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {!hideAuthorRow && (
                    <View style={[styles.postHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                            style={styles.postAuthorRow}
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
                                    {formatDate(item.createdAt)}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Experiencia badge + ellipsis para dueño */}
                        {isOwnCard && (
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

                <View style={styles.body}>
                    <Text style={[styles.profession, { color: colors.text }]} numberOfLines={hideAuthorRow ? 2 : 1}>
                        {item.profession || ''}
                    </Text>

                    {/* Badge de experiencia debajo del título */}
                    {!!item.experienceYears && (
                        <View style={styles.experienceInBodyRow}>
                            <Ionicons name="ribbon-outline" size={13} color={colors.primary} />
                            <Text style={[styles.experienceInBodyText, { color: colors.primary }]}>
                                {item.experienceYears} año{item.experienceYears !== 1 ? 's' : ''} de experiencia
                            </Text>
                        </View>
                    )}

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

                {/* ── Botones de contacto (solo para otros usuarios) ── */}
                {!isOwnCard && (
                    <View style={styles.contactRow}>
                        {/* WhatsApp — solo si hay teléfono */}
                        {!!item.contactPhone && (
                            <TouchableOpacity
                                style={[styles.contactBtn, styles.whatsappBtn]}
                                onPress={handleWhatsApp}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="logo-whatsapp" size={15} color="#FFF" />
                                <Text style={styles.contactBtnText}>WhatsApp</Text>
                            </TouchableOpacity>
                        )}
                        {/* Mensaje Privado */}
                        <TouchableOpacity
                            style={[styles.contactBtn, { backgroundColor: colors.primary }]}
                            onPress={handlePrivateMessage}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FFF" />
                            <Text style={styles.contactBtnText}>Mensaje Privado</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>

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
                        <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>
                            Opciones del servicio
                        </Text>

                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.border }]}
                            onPress={handleEdit}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(255,101,36,0.1)' }]}>
                                <Ionicons name="create-outline" size={20} color="#FF6524" />
                            </View>
                            <View style={styles.menuItemText}>
                                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Editar servicio</Text>
                                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Modifica los datos de tu publicación</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

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
                                <Text style={[styles.menuItemTitle, { color: '#F44336' }]}>Eliminar servicio</Text>
                                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Esta acción no se puede deshacer</Text>
                            </View>
                        </TouchableOpacity>

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
        </>
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
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    postAuthorRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
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
    postEllipsis: {
        paddingLeft: 12,
    },
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
        marginBottom: 8,
        fontStyle: 'italic',
    },
    experienceInBodyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
    },
    experienceInBodyText: {
        fontSize: 12,
        fontWeight: '700',
    },
    // ── Contacto ──
    contactRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 8,
        paddingBottom: 14,
        paddingTop: 4,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 13,
        borderRadius: 12,
    },
    whatsappBtn: {
        backgroundColor: '#25D366',
    },
    contactBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
    },
    // ── Owner menu ──
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    menuSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        padding: 20,
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
        letterSpacing: 1,
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 14,
    },
    menuItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuItemText: { flex: 1 },
    menuItemTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    menuItemSub: {
        fontSize: 12,
        marginTop: 2,
    },
    cancelBtn: {
        marginTop: 16,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '700',
    },
    // ── Confirm delete modal ──
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        backgroundColor: 'rgba(244,67,54,0.12)',
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
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 20,
    },
    confirmDivider: {
        width: '100%',
        height: StyleSheet.hairlineWidth,
        marginBottom: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
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
});
