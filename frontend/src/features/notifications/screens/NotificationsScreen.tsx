import * as React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_MY_NOTIFICATIONS, MARK_AS_READ, GET_UNREAD_NOTIFICATIONS_COUNT, NOTIFICATION_ADDED_SUBSCRIPTION } from '../graphql/notifications.operations';
import AppealModal from '../components/AppealModal';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth/context/AuthContext';

export default function NotificationsScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [appealItem, setAppealItem] = React.useState<any>(null);

    const formatDate = (isoString: string) => {
        if (!isoString) return '';
        const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
        const date = new Date(utcString);
        const hoy = new Date();
        const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (date.toDateString() === hoy.toDateString()) return `Hoy a las ${timeString}`;
        if (date.toDateString() === ayer.toDateString()) return `Ayer a las ${timeString}`;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year} a las ${timeString}`;
    };

    const { user } = useAuth() as any;

    const { data, loading, refetch, subscribeToMore } = useQuery<any>(GET_MY_NOTIFICATIONS, {
        variables: { limit: 50, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    React.useEffect(() => {
        if (!user?.id) return;

        const unsubscribe = subscribeToMore({
            document: NOTIFICATION_ADDED_SUBSCRIPTION,
            variables: { userId: user.id },
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data) return prev;
                const newNotification = subscriptionData.data.notificationAdded;

                // Evitar duplicados
                if (prev?.getMyNotifications?.some((n: any) => n.id === newNotification.id)) {
                    return prev;
                }

                return {
                    getMyNotifications: [newNotification, ...(prev?.getMyNotifications || [])],
                };
            },
        });

        return () => unsubscribe();
    }, [user?.id, subscribeToMore]);

    const [markAsRead] = useMutation(MARK_AS_READ, {
        update(cache, { data }) {
            const isReadSuccess = data?.markNotificationAsRead?.isRead;
            if (isReadSuccess) {
                try {
                    const existing = cache.readQuery<{ getUnreadNotificationsCount: number }>({
                        query: GET_UNREAD_NOTIFICATIONS_COUNT,
                    });
                    if (existing && existing.getUnreadNotificationsCount > 0) {
                        cache.writeQuery({
                            query: GET_UNREAD_NOTIFICATIONS_COUNT,
                            data: {
                                getUnreadNotificationsCount: Math.max(0, existing.getUnreadNotificationsCount - 1),
                            },
                        });
                    }
                } catch (e) {
                    console.log('Error updating unread count in cache:', e);
                }
            }
        }
    });

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

        if (item.data) {
            try {
                const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
                if (parsedData) {
                    if (parsedData.postId && (parsedData.type === 'POST_DETAIL' || parsedData.type === 'STORE_DETAIL')) {
                        router.push({
                            pathname: '/postDetail',
                            params: { postId: parsedData.postId, isStore: parsedData.type === 'STORE_DETAIL' ? 'true' : 'false' }
                        });
                    } else if (parsedData.userId && parsedData.type === 'USER_PROFILE') {
                        router.push({
                            pathname: '/profile',
                            params: { userId: parsedData.userId }
                        });
                    } else if (parsedData.conversationId && parsedData.type === 'CHAT_ROOM') {
                        router.push({
                            pathname: '/chatRoom',
                            params: { conversationId: parsedData.conversationId }
                        });
                    }
                }
            } catch (err) {
                console.error('Error parsing notification data:', err);
            }
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isUnread = !item.isRead;
        const bgColor = isUnread 
            ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.06)') 
            : colors.surface;
        
        const titleStyle = isUnread ? { fontWeight: 'bold' as const } : { fontWeight: '600' as const };
        const dateString = formatDate(item.createdAt);

        let parsedData: any = null;
        if (item.data) {
            try {
                parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            } catch (err) {
                console.error(err);
            }
        }

        const renderIconOrAvatar = () => {
            if (item.type === 'SOCIAL' && parsedData) {
                if (parsedData.senderAvatar) {
                    return (
                        <Image 
                            source={{ uri: parsedData.senderAvatar }} 
                            style={styles.avatarImage} 
                        />
                    );
                } else if (parsedData.senderName) {
                    const parts = parsedData.senderName.trim().split(' ');
                    const initials = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
                    return (
                        <View style={[styles.avatarInitialsContainer, { backgroundColor: colors.primary + '1F' }]}>
                            <Text style={[styles.avatarInitialsText, { color: colors.primary }]}>
                                {initials}
                            </Text>
                        </View>
                    );
                }
            }

            let iconName: keyof typeof Ionicons.glyphMap = 'notifications-outline';
            let iconColor = colors.textSecondary;

            if (item.type === 'MODERATION') {
                iconName = 'shield-half-outline';
                iconColor = '#EF4444';
            } else if (item.type === 'SYSTEM') {
                iconName = 'information-circle-outline';
                iconColor = '#3B82F6';
            } else if (item.type === 'SOCIAL') {
                iconName = 'chatbubble-ellipses-outline';
                iconColor = colors.primary;
            }

            return <Ionicons name={iconName} size={22} color={iconColor} />;
        };

        const showAvatar = item.type === 'SOCIAL' && parsedData && (parsedData.senderAvatar || parsedData.senderName);
        const iconBg = showAvatar 
            ? 'transparent'
            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)');

        return (
            <TouchableOpacity 
                style={[styles.notificationCard, { backgroundColor: bgColor, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.2)' : colors.border }]}
                onPress={() => handlePressNotification(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    {renderIconOrAvatar()}
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
                            <Text style={styles.appealBtnText}>Apelar Decisión</Text>
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
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarInitialsContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitialsText: {
        fontSize: 14,
        fontWeight: 'bold',
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
        backgroundColor: '#3B82F6',
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
