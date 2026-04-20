import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { CREATE_APPEAL } from '../graphql/notifications.operations';

interface AppealModalProps {
    visible: boolean;
    onClose: () => void;
    notificationItem?: any; // O el ID para apelar
    appealType?: 'CONTENT_DELETION' | 'ACCOUNT_BAN';
}

export default function AppealModal({ visible, onClose, notificationItem, appealType = 'CONTENT_DELETION' }: AppealModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [reason, setReason] = useState('');

    const [createAppeal, { loading }] = useMutation(CREATE_APPEAL);

    const handleSubmit = async () => {
        if (reason.trim().length < 10) {
            Toast.show({
                type: 'error',
                text1: 'Justificación muy corta',
                text2: 'Por favor explica detalladamente por qué deberíamos revertir la decisión.',
            });
            return;
        }

        try {
            await createAppeal({
                variables: {
                    input: {
                        reason: reason.trim(),
                        type: appealType,
                        referenceId: null // O el ID real si estuviera en la notificación
                    }
                }
            });

            Toast.show({
                type: 'success',
                text1: 'Apelación Enviada',
                text2: 'Tu caso será revisado pronto.',
            });
            
            setReason('');
            onClose();
        } catch (error: any) {
            const errorMsg = error.message || 'Error desconocido';
            if (errorMsg.includes('Ya tienes una apelación pendiente')) {
                Toast.show({
                    type: 'error',
                    text1: 'Apelación en curso',
                    text2: 'Ya hemos recibido tu apelación para este caso. Está en revisión.',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error al apelar',
                    text2: 'No se pudo procesar tu solicitud en este momento.',
                });
            }
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                
                <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingBottom: Math.max(20, insets.bottom + 10) }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Apelar Decisión</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        Si consideras que hemos cometido un error al moderar tu contenido, puedes presentar una apelación formal. Por favor explica claramente tu caso.
                    </Text>

                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                        placeholder="Escribe tu justificación aquí..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                        value={reason}
                        onChangeText={setReason}
                        maxLength={1000}
                    />

                    <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitBtnText}>Enviar Apelación</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        height: 120,
        padding: 12,
        fontSize: 15,
        marginBottom: 20,
    },
    submitBtn: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
