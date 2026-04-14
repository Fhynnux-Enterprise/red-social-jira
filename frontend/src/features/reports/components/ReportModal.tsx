import React, { useState, useRef } from 'react';
import {
    View,
    Text,
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
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../theme/ThemeContext';
import { CREATE_REPORT } from '../graphql/reports.operations';

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
}

export default function ReportModal({
    visible,
    onClose,
    reportedItemId,
    reportedItemType,
}: ReportModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const slideAnim = useRef(new Animated.Value(400)).current;

    // ── Animación de entrada / salida ──────────────────────────────────────
    React.useEffect(() => {
        if (visible) {
            setSelectedReason(null);
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
            onClose();
            // Pequeño delay para que el modal cierre antes de mostrar el toast
            setTimeout(() => {
                Toast.show({
                    type: 'success',
                    text1: '¡Gracias por tu ayuda! 🙌',
                    text2: 'Gracias por ayudar a mantener Chunchi City seguro.',
                    visibilityTime: 4000,
                });
            }, 350);
        },
        onError: (err) => {
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
            </Animated.View>
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
});
