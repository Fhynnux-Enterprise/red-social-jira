import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Animated, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Toast from 'react-native-toast-message';

interface CopyTextModalProps {
    visible: boolean;
    textToCopy: string;
    onClose: () => void;
}

export default function CopyTextModal({ visible, textToCopy, onClose }: CopyTextModalProps) {
    const { colors, isDark } = useTheme();

    const handleCopy = async () => {
        if (!textToCopy) return;
        await Clipboard.setStringAsync(textToCopy);
        Toast.show({
            type: 'success',
            text1: 'Copiado',
            text2: 'El texto ha sido copiado al portapapeles',
            position: 'top',
            visibilityTime: 2000,
        });
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
                    <TouchableWithoutFeedback>
                        <Animated.View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                            <TouchableOpacity style={styles.optionButton} onPress={handleCopy} activeOpacity={0.7}>
                                <Ionicons name="copy-outline" size={22} color={colors.text} />
                                <Text style={[styles.optionText, { color: colors.text }]}>Copiar texto</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: 250,
        borderRadius: 14,
        paddingVertical: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    optionText: {
        fontSize: 16,
        marginLeft: 15,
        fontWeight: '500',
    },
});
