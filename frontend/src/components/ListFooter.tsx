import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface ListFooterProps {
    message?: string;
    visible?: boolean;
}

export default function ListFooter({ message = 'Has llegado al final', visible = true }: ListFooterProps) {
    const { colors, isDark } = useTheme();

    if (!visible) return <View style={{ height: 40 }} />;

    return (
        <View style={styles.container}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,101,36,0.1)' : 'rgba(255,101,36,0.05)' }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FF6524" />
                </View>
                <Text style={[styles.text, { color: colors.textSecondary }]}>
                    {message}
                </Text>
            </View>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        opacity: 0.8,
    },
    line: {
        flex: 1,
        height: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
    },
    iconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
