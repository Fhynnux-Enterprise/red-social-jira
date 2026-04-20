import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client/react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_UNREAD_NOTIFICATIONS_COUNT } from '../graphql/notifications.operations';

export default function NotificationBell() {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();

    const { data } = useQuery(GET_UNREAD_NOTIFICATIONS_COUNT, {
        pollInterval: 30000, // Refresh every 30s as a simple mechanism
        fetchPolicy: 'cache-and-network',
    });

    const unreadCount = data?.getUnreadNotificationsCount || 0;

    return (
        <TouchableOpacity 
            style={styles.container}
            onPress={() => navigation.navigate('Notifications')}
        >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 8,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    }
});
