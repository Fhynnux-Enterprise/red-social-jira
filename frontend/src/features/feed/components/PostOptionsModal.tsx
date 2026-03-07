import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import ConfirmModal from '../../../components/ConfirmModal';

interface PostOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function PostOptionsModal({ visible, onClose, onEdit, onDelete }: PostOptionsModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => getStyles(colors, isDark, insets), [colors, isDark, insets]);

    const [showConfirm, setShowConfirm] = useState(false);

    const handleDeletePress = () => {
        setShowConfirm(true);
    };

    const confirmDelete = () => {
        setShowConfirm(false);
        onClose();
        onDelete();
    };

    const handleEditPress = () => {
        onClose();
        onEdit();
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.handleIndicator} />

                                <Text style={styles.modalTitle}>Opciones</Text>

                                <TouchableOpacity style={styles.optionButton} onPress={handleEditPress}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="pencil" size={20} color={colors.text} />
                                    </View>
                                    <Text style={styles.optionText}>Editar publicación</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.optionButton} onPress={handleDeletePress}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                                        <Ionicons name="trash" size={20} color="#FF3B30" />
                                    </View>
                                    <Text style={[styles.optionText, { color: '#FF3B30' }]}>Eliminar publicación</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ConfirmModal
                visible={showConfirm}
                title="Eliminar publicación"
                message="¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
                onCancel={() => setShowConfirm(false)}
                onConfirm={confirmDelete}
            />
        </>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean, insets: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handleIndicator: {
        width: 40,
        height: 5,
        backgroundColor: isDark ? '#444' : '#DDD',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#333' : '#F0F0F0',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? '#333' : '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    optionText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
});
