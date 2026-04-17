import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../theme/ThemeContext';
import { BAN_USER } from '../graphql/moderation.operations';

interface BanUserModalProps {
    visible: boolean;
    onClose: () => void;
    targetUser: { id: string; firstName: string; lastName: string; username: string } | null;
    onSuccess?: () => void;
}

type BanMode = 'picker' | 'permanent';

// Minimum date = tomorrow
const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    return d;
};

const formatDateLong = (d: Date) =>
    d.toLocaleDateString('es-EC', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

const formatTime = (d: Date) =>
    d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

const daysBetween = (from: Date, to: Date) =>
    Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));

export default function BanUserModal({ visible, onClose, targetUser, onSuccess }: BanUserModalProps) {
    const { colors, isDark } = useTheme();

    const [mode, setMode] = useState<BanMode>('picker');
    const [banDate, setBanDate] = useState<Date>(tomorrow());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pickerPhase, setPickerPhase] = useState<'date' | 'time'>('date');
    const [reason, setReason] = useState('');
    const [wipeContent, setWipeContent] = useState(false);
    const insets = useSafeAreaInsets();

    const [banUser, { loading }] = useMutation(BAN_USER, {
        onCompleted: () => {
            Toast.show({
                type: 'success',
                text1: 'Usuario suspendido',
                text2: mode === 'permanent'
                    ? `${targetUser?.firstName} ha sido baneado permanentemente.`
                    : `${targetUser?.firstName} estará suspendido hasta el ${formatDateLong(banDate)}.`,
            });
            handleClose();
            onSuccess?.();
        },
        onError: (err) => {
            Toast.show({
                type: 'error',
                text1: 'Error al banear',
                text2: err.message || 'No se pudo aplicar la sanción.',
            });
        },
    });

    const handleClose = () => {
        setMode('picker');
        setBanDate(tomorrow());
        setShowDatePicker(false);
        setShowTimePicker(false);
        setReason('');
        setWipeContent(false);
        onClose();
    };

    const handleConfirm = () => {
        if (!reason.trim()) {
            Toast.show({ type: 'info', text1: 'El motivo es obligatorio' });
            return;
        }
        const durationInDays = mode === 'permanent' ? 999 : daysBetween(new Date(), banDate);
        banUser({
            variables: {
                userId: targetUser?.id,
                durationInDays,
                reason: reason.trim(),
                wipeContent,
            },
        });
    };

    // Android: date + time in two separate pickers
    const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS === 'android') {
            if (event.type === 'dismissed') {
                setShowDatePicker(false);
                setShowTimePicker(false);
                return;
            }
            if (pickerPhase === 'date' && selected) {
                const updated = new Date(selected);
                updated.setHours(banDate.getHours(), banDate.getMinutes());
                setBanDate(updated);
                setShowDatePicker(false);
                // Now show time picker
                setPickerPhase('time');
                setShowTimePicker(true);
            } else if (pickerPhase === 'time' && selected) {
                const updated = new Date(banDate);
                updated.setHours(selected.getHours(), selected.getMinutes());
                setBanDate(updated);
                setShowTimePicker(false);
                setPickerPhase('date');
            }
        } else {
            // iOS: inline picker
            if (selected) setBanDate(selected);
        }
    };

    const openDatePicker = () => {
        setPickerPhase('date');
        if (Platform.OS === 'android') {
            setShowDatePicker(true);
        } else {
            setShowDatePicker((v) => !v);
        }
    };

    const s = styles(colors, isDark, insets);

    const daysLeft = mode === 'permanent' ? null : daysBetween(new Date(), banDate);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                style={s.backdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />

                <View style={s.sheet}>
                    {/* Drag handle */}
                    <View style={s.dragHandle} />

                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.iconBg}>
                            <LinearGradient colors={['#7F1D1D', '#EF4444']} style={s.iconGradient}>
                                <Ionicons name="ban" size={22} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.title}>Suspender usuario</Text>
                            <Text style={s.subtitle} numberOfLines={1}>
                                @{targetUser?.username} · {targetUser?.firstName} {targetUser?.lastName}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} disabled={loading} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 8 }}
                    >
                        {/* ─── Mode selector ─────────────────────────────────── */}
                        <Text style={s.sectionLabel}>Duración de la suspensión</Text>
                        <View style={s.modeRow}>
                            {/* Fecha personalizada */}
                            <TouchableOpacity
                                style={[s.modeChip, mode === 'picker' && s.modeChipActive]}
                                onPress={() => setMode('picker')}
                                disabled={loading}
                            >
                                <Ionicons
                                    name="calendar"
                                    size={16}
                                    color={mode === 'picker' ? colors.primary : colors.textSecondary}
                                />
                                <Text style={[s.modeChipText, mode === 'picker' && { color: colors.primary, fontWeight: '700' }]}>
                                    Hasta fecha y hora
                                </Text>
                            </TouchableOpacity>

                            {/* Permanente */}
                            <TouchableOpacity
                                style={[s.modeChip, mode === 'permanent' && s.modeChipPerma]}
                                onPress={() => setMode('permanent')}
                                disabled={loading}
                            >
                                <Ionicons
                                    name="ban"
                                    size={16}
                                    color={mode === 'permanent' ? '#FFF' : colors.textSecondary}
                                />
                                <Text style={[s.modeChipText, mode === 'permanent' && { color: '#FFF', fontWeight: '700' }]}>
                                    Permanente
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* ─── Date/time picker (modo fecha) ─────────────────── */}
                        {mode === 'picker' && (
                            <View style={s.dateSection}>
                                {/* Date display button */}
                                <TouchableOpacity style={s.dateBtn} onPress={openDatePicker} disabled={loading}>
                                    <View style={s.dateBtnIcon}>
                                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.dateBtnLabel}>Fecha y hora de expiración</Text>
                                        <Text style={s.dateBtnValue}>
                                            {formatDateLong(banDate)}, {formatTime(banDate)}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                                        size={18}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>

                                {/* iOS: inline picker */}
                                {Platform.OS === 'ios' && showDatePicker && (
                                    <View style={[s.inlinePicker, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <DateTimePicker
                                            value={banDate}
                                            mode="datetime"
                                            display="spinner"
                                            minimumDate={tomorrow()}
                                            onChange={handleDateChange}
                                            textColor={colors.text}
                                            themeVariant={isDark ? 'dark' : 'light'}
                                            locale="es-EC"
                                        />
                                    </View>
                                )}

                                {/* Android: modal pickers */}
                                {Platform.OS === 'android' && showDatePicker && (
                                    <DateTimePicker
                                        value={banDate}
                                        mode="date"
                                        display="calendar"
                                        minimumDate={tomorrow()}
                                        onChange={handleDateChange}
                                    />
                                )}
                                {Platform.OS === 'android' && showTimePicker && (
                                    <DateTimePicker
                                        value={banDate}
                                        mode="time"
                                        display="clock"
                                        onChange={handleDateChange}
                                    />
                                )}

                                {/* Duration summary pill */}
                                {daysLeft !== null && (
                                    <View style={s.durationPill}>
                                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                                        <Text style={[s.durationPillText, { color: colors.primary }]}>
                                            Duración aproximada: <Text style={{ fontWeight: '800' }}>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</Text>
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ─── Permanent mode info ────────────────────────────── */}
                        {mode === 'permanent' && (
                            <View style={s.permaBox}>
                                <Ionicons name="warning" size={16} color="#EF4444" style={{ marginTop: 1 }} />
                                <Text style={s.permaText}>
                                    El usuario será baneado indefinidamente y no podrá acceder a la plataforma hasta que un moderador levante la sanción manualmente.
                                </Text>
                            </View>
                        )}

                        {/* ─── Reason input ───────────────────────────────────── */}
                        <Text style={[s.sectionLabel, { marginTop: 16 }]}>
                            Motivo de la sanción <Text style={{ color: '#EF4444' }}>*</Text>
                        </Text>
                        <View style={[s.reasonBox, { borderColor: reason.trim() ? colors.primary : colors.border }]}>
                            <TextInput
                                style={s.reasonInput}
                                placeholder="Describe el motivo detallado de la suspensión..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={4}
                                value={reason}
                                onChangeText={setReason}
                                editable={!loading}
                            />
                            <Text style={s.charCount}>{reason.length} caracteres</Text>
                        </View>

                        {/* ─── Nuke Option ────────────────────────────────────── */}
                        <TouchableOpacity 
                            style={[s.nukeBox, wipeContent && s.nukeBoxActive]} 
                            activeOpacity={0.8} 
                            onPress={() => setWipeContent(!wipeContent)}
                            disabled={loading}
                        >
                            <View style={[s.checkbox, wipeContent && s.checkboxActive]}>
                                {wipeContent && <Ionicons name="checkmark" size={14} color="#FFF" />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.nukeTitle, wipeContent && s.nukeTitleActive]}>Erradicar todo el contenido</Text>
                                <Text style={s.nukeDesc}>Borra todas las publicaciones, ofertas, servicios y productos de este usuario.</Text>
                            </View>
                        </TouchableOpacity>

                    </ScrollView>

                    {/* ─── Action buttons ─────────────────────────────────────── */}
                    <View style={s.actions}>
                        <TouchableOpacity style={s.cancelBtn} onPress={handleClose} disabled={loading}>
                            <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                s.confirmBtn,
                                mode === 'permanent' && s.confirmBtnPerma,
                                (!reason.trim() || loading) && { opacity: 0.45 },
                            ]}
                            onPress={handleConfirm}
                            disabled={!reason.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={mode === 'permanent' ? 'ban' : 'checkmark-circle'}
                                        size={17}
                                        color="#FFF"
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={s.confirmText}>
                                        {mode === 'permanent' ? 'Banear permanentemente' : 'Aplicar suspensión'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = (colors: any, isDark: boolean, insets: any) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 32 : Math.max(20, insets.bottom + 10),
        maxHeight: '92%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 24,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconBg: {
        width: 46,
        height: 46,
        borderRadius: 23,
        overflow: 'hidden',
    },
    iconGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },

    // ── Mode selector ─────────────────────────────────────────────────────────
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 10,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    modeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    modeChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    modeChipActive: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}14`,
    },
    modeChipPerma: {
        borderColor: '#EF4444',
        backgroundColor: '#EF4444',
    },
    modeChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // ── Date section ──────────────────────────────────────────────────────────
    dateSection: { marginBottom: 4 },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
        marginBottom: 10,
    },
    dateBtnIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateBtnLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    dateBtnValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        textTransform: 'capitalize',
    },
    inlinePicker: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 10,
    },
    durationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: `${colors.primary}12`,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: `${colors.primary}25`,
    },
    durationPillText: {
        fontSize: 12,
        color: colors.primary,
    },

    // ── Permanent box ─────────────────────────────────────────────────────────
    permaBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(239,68,68,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.22)',
        marginBottom: 4,
    },
    permaText: {
        flex: 1,
        fontSize: 13,
        color: '#F87171',
        lineHeight: 19,
    },

    // ── Reason ────────────────────────────────────────────────────────────────
    reasonBox: {
        borderWidth: 1.5,
        borderRadius: 14,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        overflow: 'hidden',
    },
    reasonInput: {
        padding: 14,
        fontSize: 14,
        color: colors.text,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'right',
        paddingHorizontal: 14,
        paddingBottom: 8,
    },

    // ── Actions ───────────────────────────────────────────────────────────────
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
    confirmBtn: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
    },
    confirmBtnPerma: {
        backgroundColor: '#DC2626',
    },
    confirmText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },

    // ── Nuke Option ──────────────────────────────────────────────────────────
    nukeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    },
    nukeBoxActive: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.textSecondary,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    nukeTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    nukeTitleActive: {
        color: '#EF4444',
    },
    nukeDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },
});
