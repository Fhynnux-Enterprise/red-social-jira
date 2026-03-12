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

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmColor?: string;
}

export default function ConfirmationModal({
    visible,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    confirmColor = '#FF3B30',
}: ConfirmationModalProps) {
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                            
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            
                            <View style={styles.buttonRow}>
                                <TouchableOpacity 
                                    style={styles.button} 
                                    onPress={onCancel}
                                >
                                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{cancelText}</Text>
                                </TouchableOpacity>
                                
                                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

                                <TouchableOpacity 
                                    style={styles.button} 
                                    onPress={onConfirm}
                                >
                                    <Text style={[styles.buttonText, { color: confirmColor, fontWeight: 'bold' }]}>{confirmText}</Text>
                                </TouchableOpacity>
                            </View>
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
        padding: 40,
    },
    modalContent: {
        width: '100%',
        borderRadius: 20,
        paddingTop: 20,
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
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    buttonRow: {
        flexDirection: 'row',
        height: 56,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
    },
    verticalDivider: {
        width: StyleSheet.hairlineWidth,
        height: '100%',
    },
});
