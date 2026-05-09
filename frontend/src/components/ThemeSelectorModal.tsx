import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface ThemeSelectorModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ThemeSelectorModal({ visible, onClose }: ThemeSelectorModalProps) {
    const insets = useSafeAreaInsets();
    const { themeMode, appTheme, colors, setThemeMode, setAppTheme } = useTheme();

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
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.title}>Configuración visual</Text>
                                <Text style={styles.subtitle}>
                                    Personaliza cómo se ve {Constants.expoConfig?.extra?.cityName || 'la app'} en este dispositivo.
                                </Text>

                                {/* --- SECCIÓN TEMA (OSCURO/CLARO) --- */}
                                <Text style={styles.sectionTitle}>Modo de visualización</Text>
                                <View style={styles.optionsContainer}>
                                    <TouchableOpacity style={styles.optionBtn} onPress={() => setThemeMode('system')}>
                                        <View style={styles.optionLeft}>
                                            <View style={styles.iconBox}>
                                                <Ionicons name="phone-portrait-outline" size={22} color={colors.text} />
                                            </View>
                                            <Text style={[styles.optionText, { color: colors.text }]}>Sistema</Text>
                                        </View>
                                        <Ionicons
                                            name={themeMode === 'system' ? 'radio-button-on' : 'radio-button-off'}
                                            size={24}
                                            color={themeMode === 'system' ? colors.primary : colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionBtn} onPress={() => setThemeMode('dark')}>
                                        <View style={styles.optionLeft}>
                                            <View style={styles.iconBox}>
                                                <Ionicons name="moon-outline" size={22} color={colors.text} />
                                            </View>
                                            <Text style={[styles.optionText, { color: colors.text }]}>Oscuro</Text>
                                        </View>
                                        <Ionicons
                                            name={themeMode === 'dark' ? 'radio-button-on' : 'radio-button-off'}
                                            size={24}
                                            color={themeMode === 'dark' ? colors.primary : colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionBtn} onPress={() => setThemeMode('light')}>
                                        <View style={styles.optionLeft}>
                                            <View style={styles.iconBox}>
                                                <Ionicons name="sunny-outline" size={22} color={colors.text} />
                                            </View>
                                            <Text style={[styles.optionText, { color: colors.text }]}>Claro</Text>
                                        </View>
                                        <Ionicons
                                            name={themeMode === 'light' ? 'radio-button-on' : 'radio-button-off'}
                                            size={24}
                                            color={themeMode === 'light' ? colors.primary : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.divider} />

                                {/* --- SECCIÓN COLOR DE LA APP --- */}
                                <Text style={styles.sectionTitle}>Color de la App</Text>
                                <View style={styles.optionsContainer}>
                                    <TouchableOpacity style={styles.optionBtn} onPress={() => setAppTheme('mountain')}>
                                        <View style={styles.optionLeft}>
                                            <View style={[styles.colorCircle, { backgroundColor: '#00b341' }]} />
                                            <Text style={[styles.optionText, { color: colors.text }]}>Montaña (Verde)</Text>
                                        </View>
                                        <Ionicons
                                            name={appTheme === 'mountain' ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={24}
                                            color={appTheme === 'mountain' ? colors.primary : colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionBtn} onPress={() => setAppTheme('sunset')}>
                                        <View style={styles.optionLeft}>
                                            <View style={[styles.colorCircle, { backgroundColor: '#ff6524' }]} />
                                            <Text style={[styles.optionText, { color: colors.text }]}>Atardecer (Naranja)</Text>
                                        </View>
                                        <Ionicons
                                            name={appTheme === 'sunset' ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={24}
                                            color={appTheme === 'sunset' ? colors.primary : colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.optionBtn} onPress={() => setAppTheme('ocean')}>
                                        <View style={styles.optionLeft}>
                                            <View style={[styles.colorCircle, { backgroundColor: '#00ACC1' }]} />
                                            <Text style={[styles.optionText, { color: colors.text }]}>Océano (Turquesa)</Text>
                                        </View>
                                        <Ionicons
                                            name={appTheme === 'ocean' ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={24}
                                            color={appTheme === 'ocean' ? colors.primary : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#121212', // Forzado a dark para el modal
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        maxHeight: '80%',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#333',
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 16,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    optionsContainer: {
        marginBottom: 10,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    colorCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 16,
        marginLeft: 6,
        borderWidth: 2,
        borderColor: '#333',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#222',
        marginVertical: 20,
    }
});
