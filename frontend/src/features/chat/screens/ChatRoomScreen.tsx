import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function ChatRoomScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { chatId, userId } = route.params || {};

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {userId ? `Chat con usuario ${userId}` : 'Sala de Chat'}
                </Text>
            </View>

            {/* Content */}
            <View style={styles.center}>
                <Text style={[styles.title, { color: colors.text }]}>Sala de Chat</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    ID del Chat: {chatId || 'Nuevo Chat'}
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 8,
    },
});
