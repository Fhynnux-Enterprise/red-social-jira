import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const BaseCustomToast = ({ type, text1, text2 }: any) => {
    // Detectamos dinámicamente el modo de nuestro Motor de Temas global
    const { isDark, colors } = useTheme();
    const theme = colors;

    let iconName: keyof typeof Ionicons.glyphMap = 'information-circle';
    let typeColor = theme.textSecondary;

    if (type === 'success') {
        iconName = 'checkmark-circle';
        typeColor = colors.primary;
    } else if (type === 'error') {
        iconName = 'alert-circle';
        typeColor = theme.error;
    }

    return (
        <View style={[
            styles.toastContainer,
            {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderLeftColor: typeColor
            }
        ]}>
            <Ionicons name={iconName} size={28} color={typeColor} style={styles.icon} />
            <View style={styles.textContainer}>
                {text1 ? <Text style={[styles.text1, { color: theme.text }]}>{text1}</Text> : null}
                {text2 ? <Text style={[styles.text2, { color: theme.textSecondary }]}>{text2}</Text> : null}
            </View>
        </View>
    );
};

// Exportamos la configuración global que requiere la librería
export const customToastConfig = {
    success: (props: any) => <BaseCustomToast {...props} type="success" />,
    error: (props: any) => <BaseCustomToast {...props} type="error" />,
    info: (props: any) => <BaseCustomToast {...props} type="info" />,
};

const styles = StyleSheet.create({
    toastContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '92%', // Más ancho para que abarque bien
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderLeftWidth: 6,
        borderWidth: 1,
        // Sombras modernas
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    icon: {
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
    },
    text1: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    text2: {
        fontSize: 14,
        lineHeight: 20,
    },
});
