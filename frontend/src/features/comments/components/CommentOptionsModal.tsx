import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

interface CommentOptionsModalProps {
    visible: boolean;
    commentId: string | null;
    onClose: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function CommentOptionsModal({
    visible,
    commentId,
    onClose,
    onEdit,
    onDelete,
}: CommentOptionsModalProps) {
    const { colors } = useTheme();

    if (!commentId) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.title, { color: colors.text }]}>Opciones</Text>
                            
                            <TouchableOpacity 
                                style={[styles.button, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]} 
                                onPress={() => {
                                    onEdit(commentId);
                                    onClose();
                                }}
                            >
                                <Text style={[styles.buttonText, { color: colors.text }]}>Editar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.button, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]} 
                                onPress={() => {
                                    onDelete(commentId);
                                    onClose();
                                }}
                            >
                                <Text style={[styles.buttonText, { color: '#FF3B30', fontWeight: 'bold' }]}>Eliminar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.button} 
                                onPress={onClose}
                            >
                                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '85%',
        borderRadius: 20,
        paddingVertical: 10,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 15,
    },
    button: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
    },
});
