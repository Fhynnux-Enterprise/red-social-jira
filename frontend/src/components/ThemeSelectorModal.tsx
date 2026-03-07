import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface ThemeSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectTheme?: (theme: 'system' | 'light' | 'dark') => void;
    currentTheme?: 'system' | 'light' | 'dark';
}

export default function ThemeSelectorModal({ visible, onClose, onSelectTheme, currentTheme = 'system' }: ThemeSelectorModalProps) {
    const insets = useSafeAreaInsets();

    const handleSelect = (theme: 'system' | 'light' | 'dark') => {
        if (onSelectTheme) {
            onSelectTheme(theme);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
                            <View style={styles.handle} />
                            <Text style={styles.title}>Elige tu tema</Text>
                            <Text style={styles.subtitle}>
                                Personaliza cómo se ve Chunchi City en este dispositivo.
                            </Text>

                            <View style={styles.optionsContainer}>
                                {/* Opción Sistema */}
                                <TouchableOpacity
                                    style={styles.optionBtn}
                                    onPress={() => handleSelect('system')}
                                >
                                    <View style={styles.optionLeft}>
                                        <View style={styles.iconBox}>
                                            <Ionicons name="phone-portrait-outline" size={24} color={colors.dark.text} />
                                        </View>
                                        <Text style={styles.optionText}>Usar el del sistema</Text>
                                    </View>
                                    <Ionicons
                                        name={currentTheme === 'system' ? 'radio-button-on' : 'radio-button-off'}
                                        size={24}
                                        color={currentTheme === 'system' ? colors.primary : colors.dark.textSecondary}
                                    />
                                </TouchableOpacity>

                                {/* Opción Oscuro */}
                                <TouchableOpacity
                                    style={styles.optionBtn}
                                    onPress={() => handleSelect('dark')}
                                >
                                    <View style={styles.optionLeft}>
                                        <View style={styles.iconBox}>
                                            <Ionicons name="moon-outline" size={24} color={colors.dark.text} />
                                        </View>
                                        <Text style={styles.optionText}>Oscuro</Text>
                                    </View>
                                    <Ionicons
                                        name={currentTheme === 'dark' ? 'radio-button-on' : 'radio-button-off'}
                                        size={24}
                                        color={currentTheme === 'dark' ? colors.primary : colors.dark.textSecondary}
                                    />
                                </TouchableOpacity>

                                {/* Opción Claro */}
                                <TouchableOpacity
                                    style={styles.optionBtn}
                                    onPress={() => handleSelect('light')}
                                >
                                    <View style={styles.optionLeft}>
                                        <View style={styles.iconBox}>
                                            <Ionicons name="sunny-outline" size={24} color={colors.dark.text} />
                                        </View>
                                        <Text style={styles.optionText}>Claro</Text>
                                    </View>
                                    <Ionicons
                                        name={currentTheme === 'light' ? 'radio-button-on' : 'radio-button-off'}
                                        size={24}
                                        color={currentTheme === 'light' ? colors.primary : colors.dark.textSecondary}
                                    />
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
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: colors.dark.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.dark.border,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.dark.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: colors.dark.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    optionsContainer: {
        gap: 16,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.dark.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionText: {
        fontSize: 16,
        color: colors.dark.text,
        fontWeight: '500',
    },
});
