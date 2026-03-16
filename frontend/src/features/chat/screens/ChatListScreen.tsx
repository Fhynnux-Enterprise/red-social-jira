import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

export default function ChatListScreen() {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={80} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>Tus Mensajes</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Aquí aparecerán tus conversaciones pronto.
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
});
