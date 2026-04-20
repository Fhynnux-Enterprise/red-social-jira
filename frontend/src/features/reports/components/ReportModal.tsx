import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Platform,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { CREATE_REPORT, DIRECT_MODERATE_CONTENT } from '../graphql/reports.operations';

// ── Tipos de contenido soportados ──────────────────────────────────────────
export type ReportedItemType = 'POST' | 'JOB_OFFER' | 'SERVICE' | 'PRODUCT' | 'COMMENT';

interface ReportReason {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const REPORT_REASONS: ReportReason[] = [
    { id: 'SPAM', label: 'Spam o Publicidad no deseada', icon: 'ban-outline' },
    { id: 'INAPPROPRIATE', label: 'Contenido Inapropiado u Ofensivo', icon: 'warning-outline' },
    { id: 'SCAM', label: 'Estafa o Perfil Falso', icon: 'alert-circle-outline' },
    { id: 'HATE_SPEECH', label: 'Discurso de odio o discriminación', icon: 'people-outline' },
    { id: 'VIOLENCE', label: 'Violencia o contenido peligroso', icon: 'skull-outline' },
    { id: 'MISINFORMATION', label: 'Información falsa o engañosa', icon: 'information-circle-outline' },
    { id: 'OTHER', label: 'Otro motivo', icon: 'ellipsis-horizontal-circle-outline' },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface ReportModalProps {
    visible: boolean;
    onClose: () => void;
    reportedItemId: string;
    reportedItemType: ReportedItemType;
    /** Callback para cuando un moderador elimina el contenido.
     *  Permite al padre refrescar la lista y cerrar otros modales al instante. */
    onContentDeleted?: () => void;
}

export default function ReportModal({
    visible,
    onClose,
    reportedItemId,
    reportedItemType,
    onContentDeleted,
}: ReportModalProps) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [moderatorNote, setModeratorNote] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const slideAnim = useRef(new Animated.Value(400)).current;

    const isModerator = user?.role === 'MODERATOR' || user?.role === 'ADMIN';
    // Todos los tipos denunciables soportan borrado directo de moderador
    const canDirectDelete = isModerator;

    // ── Animación de entrada / salida ──────────────────────────────────────
    React.useEffect(() => {
        if (visible) {
            setSelectedReason(null);
            setModeratorNote('');
            setConfirmDelete(false);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 180,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 400,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    // ── Mutación ───────────────────────────────────────────────────────────
    const [createReport, { loading }] = useMutation(CREATE_REPORT, {
        onCompleted: () => {
            // Mostramos el toast DENTRO del modal (misma capa), luego cerramos
            Toast.show({
                type: 'success',
                text1: '¡Gracias por tu ayuda!',
                text2: 'Gracias por ayudar a mantener Chunchi City seguro.',
                visibilityTime: 3000,
            });
            setTimeout(onClose, 1800);
        },
        onError: (err) => {
            // Detección doble: por mensaje "ALREADY_REPORTED" o por código HTTP 409
            const isAlreadyReported =
                err.message?.includes('ALREADY_REPORTED') ||
                err.graphQLErrors?.some(
                    (e) =>
                        e.message?.includes('ALREADY_REPORTED') ||
                        (e.extensions?.statusCode as number) === 409,
                );

            if (isAlreadyReported) {
                // Mostramos el toast y luego cerramos con un leve delay para que sea visible
                Toast.show({
                    type: 'info',
                    text1: 'Ya lo reportaste',
                    text2: 'Ya reportaste esta publicación. Nuestro equipo lo está revisando.',
                    visibilityTime: 3500,
                });
                setTimeout(onClose, 1800);
                return;
            }

            Toast.show({
                type: 'error',
                text1: 'No se pudo enviar la denuncia',
                text2: err.message || 'Inténtalo de nuevo más tarde.',
            });
        },
    });

    const handleSend = () => {
        if (!selectedReason) return;
        const reason = REPORT_REASONS.find((r) => r.id === selectedReason)?.label ?? selectedReason;
        createReport({
            variables: {
                input: {
                    reportedItemId,
                    reportedItemType,
                    reason,
                },
            },
        });
    };

    // ── Mutación de moderación directa ─────────────────────────────────
    const [directModerate, { loading: deleting }] = useMutation(DIRECT_MODERATE_CONTENT, {
        // Usar el nombre de operación para refetch — funciona sin importar las variables activas
        refetchQueries: ['GetAllReports'],
        awaitRefetchQueries: false, // No bloqueamos la UI esperando el refetch
        onCompleted: () => {
            // 1. Notificar al padre para que refresque la lista inmediatamente
            onContentDeleted?.();
            // 2. Mostrar toast dentro del modal
            Toast.show({
                type: 'success',
                text1: 'Contenido eliminado',
                text2: 'El contenido ha sido eliminado correctamente.',
                visibilityTime: 2500,
            });
            // 3. Cerrar el modal después de que el usuario vea el toast
            setTimeout(onClose, 1500);
        },
        onError: (err) => {
            Toast.show({
                type: 'error',
                text1: 'Error al eliminar',
                text2: err.message || 'Inténtalo de nuevo.',
            });
        },
    });

    const handleDirectDelete = () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        directModerate({
            variables: {
                input: {
                    reportedItemId,
                    reportedItemType,
                    moderatorNote: moderatorNote.trim() || 'Eliminado por moderador.',
                },
            },
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            />

            {/* Sheet */}
            <Animated.View
                style={[
                    styles.sheet,
                    {
                        backgroundColor: colors.surface,
                        paddingBottom: Math.max(insets.bottom, 20),
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Handle */}
                <View style={[styles.handle, { backgroundColor: colors.border }]} />

                {/* Title Row */}
                <View style={styles.titleRow}>
                    <View style={styles.flagBadge}>
                        <Ionicons name="flag" size={16} color="#F44336" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Denunciar contenido</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Selecciona el motivo de tu denuncia. Revisaremos el contenido a la brevedad.
                </Text>

                {/* Reasons List */}
                <ScrollView
                    style={styles.reasonsList}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {REPORT_REASONS.map((reason) => {
                        const isSelected = selectedReason === reason.id;
                        return (
                            <TouchableOpacity
                                key={reason.id}
                                style={[
                                    styles.reasonItem,
                                    {
                                        backgroundColor: isSelected
                                            ? isDark ? 'rgba(244,67,54,0.12)' : 'rgba(244,67,54,0.06)'
                                            : colors.background,
                                        borderColor: isSelected ? '#F44336' : colors.border,
                                    },
                                ]}
                                onPress={() => setSelectedReason(reason.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.reasonIconWrap,
                                    { backgroundColor: isSelected ? 'rgba(244,67,54,0.12)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                                ]}>
                                    <Ionicons
                                        name={reason.icon}
                                        size={18}
                                        color={isSelected ? '#F44336' : colors.textSecondary}
                                    />
                                </View>
                                <Text style={[
                                    styles.reasonLabel,
                                    { color: isSelected ? (isDark ? '#FF6B6B' : '#C62828') : colors.text }
                                ]}>
                                    {reason.label}
                                </Text>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={20} color="#F44336" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Send Button */}
                <TouchableOpacity
                    style={[
                        styles.sendBtn,
                        {
                            backgroundColor: selectedReason ? '#F44336' : colors.border,
                            opacity: selectedReason ? 1 : 0.6,
                        },
                    ]}
                    disabled={!selectedReason || loading}
                    onPress={handleSend}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <>
                            <Ionicons name="flag" size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.sendBtnText}>Enviar Denuncia</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* ── Sección exclusiva de MODERADOR ─────────────────────── */}
                {canDirectDelete && (
                    <>
                        {/* Divisor */}
                        <View style={[styles.moderatorDivider, { borderColor: colors.border }]}>
                            <View style={[styles.moderatorDividerLine, { backgroundColor: colors.border }]} />
                            <View style={[
                                styles.moderatorBadge,
                                { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' },
                            ]}>
                                <Ionicons name="shield" size={12} color="#EF4444" />
                                <Text style={styles.moderatorBadgeText}>Acciones de Moderador</Text>
                            </View>
                            <View style={[styles.moderatorDividerLine, { backgroundColor: colors.border }]} />
                        </View>

                        {/* Nota del moderador */}
                        {confirmDelete && (
                            <View style={[styles.noteContainer, { borderColor: isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)' }]}>
                                <View style={styles.noteLabelRow}>
                                    <Ionicons name="create-outline" size={13} color="#EF4444" />
                                    <Text style={[styles.noteLabel, { color: '#EF4444' }]}>Nota interna (opcional)</Text>
                                </View>
                                <TextInput
                                    value={moderatorNote}
                                    onChangeText={setModeratorNote}
                                    placeholder="Describe el motivo de la eliminación..."
                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    style={[
                                        styles.noteInput,
                                        {
                                            color: colors.text,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.03)',
                                        },
                                    ]}
                                />
                            </View>
                        )}

                        {/* Botón eliminar / confirmar */}
                        <TouchableOpacity
                            style={[
                                styles.deleteBtn,
                                {
                                    backgroundColor: confirmDelete
                                        ? '#EF4444'
                                        : isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                                    borderColor: '#EF4444',
                                },
                            ]}
                            onPress={handleDirectDelete}
                            disabled={deleting}
                            activeOpacity={0.8}
                        >
                            {deleting ? (
                                <ActivityIndicator color="#EF4444" size="small" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={confirmDelete ? 'trash' : 'trash-outline'}
                                        size={18}
                                        color={confirmDelete ? '#FFF' : '#EF4444'}
                                        style={{ marginRight: 8 }}
                                    />
                                    <Text style={[
                                        styles.deleteBtnText,
                                        { color: confirmDelete ? '#FFF' : '#EF4444' },
                                    ]}>
                                        {confirmDelete ? 'Confirmar eliminación' : 'Eliminar contenido'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Cancelar confirmación */}
                        {confirmDelete && (
                            <TouchableOpacity
                                onPress={() => setConfirmDelete(false)}
                                style={styles.cancelDeleteBtn}
                            >
                                <Text style={[styles.cancelDeleteText, { color: colors.textSecondary }]}>
                                    Cancelar
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </Animated.View>

            {/* Toast propio del modal: vive en la misma capa nativa, aparece sobre CommentsModal */}
            <Toast
                config={{
                    info: (props) => (
                        <BaseToast
                            {...props}
                            style={{
                                borderLeftColor: '#F59E0B',
                                borderLeftWidth: 5,
                                backgroundColor: colors.surface,
                                height: 'auto' as any,
                                minHeight: 60,
                                paddingVertical: 12,
                                width: '90%',
                                borderRadius: 12,
                                shadowColor: '#000',
                                shadowOpacity: 0.18,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                            contentContainerStyle={{ paddingHorizontal: 14 }}
                            text1Style={{
                                fontSize: 14,
                                fontWeight: '700',
                                color: colors.text,
                                flexWrap: 'wrap',
                            }}
                            text2Style={{
                                fontSize: 13,
                                color: colors.textSecondary,
                                flexWrap: 'wrap',
                            }}
                            text2NumberOfLines={5}
                        />
                    ),
                    success: (props) => (
                        <BaseToast
                            {...props}
                            style={{
                                borderLeftColor: '#22C55E',
                                borderLeftWidth: 5,
                                backgroundColor: colors.surface,
                                height: 'auto' as any,
                                minHeight: 60,
                                paddingVertical: 12,
                                width: '90%',
                                borderRadius: 12,
                                shadowColor: '#000',
                                shadowOpacity: 0.18,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                            contentContainerStyle={{ paddingHorizontal: 14 }}
                            text1Style={{
                                fontSize: 14,
                                fontWeight: '700',
                                color: colors.text,
                                flexWrap: 'wrap',
                            }}
                            text2Style={{
                                fontSize: 13,
                                color: colors.textSecondary,
                                flexWrap: 'wrap',
                            }}
                            text2NumberOfLines={5}
                        />
                    ),
                    error: (props) => (
                        <ErrorToast
                            {...props}
                            style={{
                                borderLeftColor: '#EF4444',
                                borderLeftWidth: 5,
                                backgroundColor: colors.surface,
                                height: 'auto' as any,
                                minHeight: 60,
                                paddingVertical: 12,
                                width: '90%',
                                borderRadius: 12,
                                shadowColor: '#000',
                                shadowOpacity: 0.18,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                            contentContainerStyle={{ paddingHorizontal: 14 }}
                            text1Style={{
                                fontSize: 14,
                                fontWeight: '700',
                                color: colors.text,
                                flexWrap: 'wrap',
                            }}
                            text2Style={{
                                fontSize: 13,
                                color: colors.textSecondary,
                                flexWrap: 'wrap',
                            }}
                            text2NumberOfLines={5}
                        />
                    ),
                }}
                position="top"
                topOffset={60}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 16,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 20,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    flagBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(244,67,54,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 17,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16,
    },
    reasonsList: {
        maxHeight: 340,
        marginBottom: 16,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
        gap: 12,
    },
    reasonIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reasonLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 4,
    },
    sendBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // ── Moderador ───────────────────────────────────────────
    moderatorDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 12,
        gap: 8,
    },
    moderatorDividerLine: {
        flex: 1,
        height: 1,
    },
    moderatorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    moderatorBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EF4444',
        letterSpacing: 0.3,
    },
    noteContainer: {
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        overflow: 'hidden',
    },
    noteLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
    },
    noteLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    noteInput: {
        fontSize: 14,
        minHeight: 72,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        lineHeight: 20,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 13,
        borderWidth: 1.5,
        marginTop: 2,
    },
    deleteBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    cancelDeleteBtn: {
        alignItems: 'center',
        paddingVertical: 10,
        marginTop: 4,
    },
    cancelDeleteText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
