import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView, TextInput, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { UPDATE_BADGE } from '../graphql/profile.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';

interface EditBadgeSectionProps {
    initialBadgeTitle: string;
    onBadgeUpdated: (newTitle: string) => void;
}

export default function EditBadgeSection({ initialBadgeTitle, onBadgeUpdated }: EditBadgeSectionProps) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const insets = useSafeAreaInsets();

    const [isBadgeModalVisible, setIsBadgeModalVisible] = useState(false);
    const [badgeTitle, setBadgeTitle] = useState(initialBadgeTitle);

    const [updateBadgeMutation, { loading: isUpdatingBadge }] = useMutation(UPDATE_BADGE);

    const handleSaveBadge = async () => {
        try {
            await updateBadgeMutation({
                variables: {
                    title: badgeTitle,
                    theme: 'default'
                }
            });
            onBadgeUpdated(badgeTitle);
            Toast.show({ type: 'success', text1: '¡Actualizado!', text2: 'Insignia modificada con éxito' });
            setIsBadgeModalVisible(false);
        } catch (error: any) {
            console.log('Error updating badge:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo actualizar la insignia' });
        }
    };

    return (
        <>
            <View style={styles.sectionDivider} />
            <TouchableOpacity
                style={styles.openModalButton}
                onPress={() => {
                    setBadgeTitle(initialBadgeTitle);
                    setIsBadgeModalVisible(true);
                }}
            >
                <View>
                    <Text style={styles.sectionTitle}>Título / Insignia</Text>
                    <Text style={styles.openModalSubtext}>
                        {initialBadgeTitle || 'Sin insignia definida'}
                    </Text>
                </View>
                <Ionicons name="medal-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={isBadgeModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsBadgeModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Editar Insignia</Text>
                        <TouchableOpacity onPress={() => setIsBadgeModalVisible(false)}>
                            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                        <View style={styles.modalFormContainer}>
                            <View style={styles.modalFormHeader}>
                                <Text style={styles.modalFormTitle}>Tu Insignia</Text>
                            </View>

                            <TextInput
                                style={styles.modalTextInput}
                                value={badgeTitle}
                                onChangeText={setBadgeTitle}
                                placeholder="Ej: Ingeniero de Software, CEO, VIP"
                                placeholderTextColor={colors.textSecondary}
                            />

                            <TouchableOpacity
                                style={[styles.modalSaveBtn, isUpdatingBadge && { opacity: 0.5 }]}
                                onPress={handleSaveBadge}
                                disabled={isUpdatingBadge}
                            >
                                {isUpdatingBadge ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                                        <Text style={styles.addFieldBtnText}>Guardar Insignia</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    sectionDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    openModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    openModalSubtext: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalScrollView: {
        flex: 1,
        padding: 20,
    },
    modalFormContainer: {
        marginTop: 20,
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 40,
    },
    modalFormHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalFormTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalTextInput: {
        color: colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        backgroundColor: colors.background,
    },
    modalSaveBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    addFieldBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
