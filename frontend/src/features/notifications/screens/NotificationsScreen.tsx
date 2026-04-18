import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_MY_NOTIFICATIONS, MARK_AS_READ } from '../graphql/notifications.operations';
import AppealModal from '../components/AppealModal';

export default function NotificationsScreen() {
    const { colors, isDark } = useTheme();
    const [appealItem, setAppealItem] = React.useState<any>(null);

    const { data, loading, refetch } = useQuery(GET_MY_NOTIFICATIONS, {
        variables: { limit: 50, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    const [markAsRead] = useMutation(MARK_AS_READ);

    const handlePressNotification = (item: any) => {
        if (!item.isRead) {
            markAsRead({
                variables: { id: item.id },
                optimisticResponse: {
                    markNotificationAsRead: {
                        __typename: 'Notification',
                        id: item.id,
                        isRead: true,
                    }
                }
            });
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isUnread = !item.isRead;
        const bgColor = isUnread 
            ? (isDark ? 'rgba(255,101,36,0.1)' : 'rgba(255,101,36,0.05)') 
            : colors.surface;
        
        const titleStyle = isUnread ? { fontWeight: 'bold' as const } : { fontWeight: '600' as const };
        const dateString = new Date(item.createdAt).toLocaleDateString('es-EC', { 
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
        });

        let iconName: keyof typeof Ionicons.glyphMap = 'notifications-outline';
        let iconColor = colors.textSecondary;

        if (item.type === 'MODERATION') {
            iconName = 'shield-half-outline';
            iconColor = '#EF4444';
        } else if (item.type === 'SYSTEM') {
            iconName = 'information-circle-outline';
            iconColor = '#3B82F6';
        }

        return (
            <TouchableOpacity 
                style={[styles.notificationCard, { backgroundColor: bgColor, borderBottomColor: colors.border }]}
                onPress={() => handlePressNotification(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Ionicons name={iconName} size={22} color={iconColor} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.text }, titleStyle]}>{item.title}</Text>
                    <Text style={[styles.cardMessage, { color: colors.textSecondary }]} numberOfLines={3}>{item.message}</Text>
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{dateString}</Text>
                    
                    {item.type === 'MODERATION' && (
                        <TouchableOpacity 
                            style={[styles.appealBtn, { backgroundColor: isDark ? 'rgba(255,101,36,0.15)' : 'rgba(255,101,36,0.1)' }]}
                            onPress={() => setAppealItem(item)}
                        >
                            <Text style={styles.appealBtnText}>⚖️ Apelar Decisión</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {isUnread && (
                    <View style={styles.unreadDot} />
                )}
            </TouchableOpacity>
        );
    };

    const notifications = data?.getMyNotifications || [];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
            </View>

            {loading && notifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="notifications-outline" size={80} color={colors.textSecondary} style={{ opacity: 0.2, marginBottom: 20 }} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes notificaciones</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                        Aquí aparecerán tus avisos de moderación y del sistema.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    refreshing={loading}
                    onRefresh={refetch}
                />
            )}

            {/* Modal de Apelación */}
            {appealItem && (
                <AppealModal
                    visible={!!appealItem}
                    onClose={() => setAppealItem(null)}
                    notificationItem={appealItem}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        marginBottom: 4,
    },
    cardMessage: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
    },
    cardDate: {
        fontSize: 12,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF6524',
        marginTop: 6,
        marginLeft: 8,
    },
    appealBtn: {
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    appealBtnText: {
        color: '#FF6524',
        fontSize: 13,
        fontWeight: 'bold',
    }
});
