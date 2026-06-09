import * as React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_MY_NOTIFICATIONS, MARK_AS_READ, GET_UNREAD_NOTIFICATIONS_COUNT, NOTIFICATION_ADDED_SUBSCRIPTION, DELETE_NOTIFICATIONS, MARK_ALL_AS_READ } from '../graphql/notifications.operations';
import AppealModal from '../components/AppealModal';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth/context/AuthContext';
import Toast from 'react-native-toast-message';

export default function NotificationsScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [appealItem, setAppealItem] = React.useState<any>(null);
    const [selectionMode, setSelectionMode] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

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

    const [deleteNotifications] = useMutation(DELETE_NOTIFICATIONS, {
        refetchQueries: [
            { query: GET_MY_NOTIFICATIONS, variables: { limit: 50, offset: 0 } },
            { query: GET_UNREAD_NOTIFICATIONS_COUNT }
        ]
    });

    const [markAllNotificationsAsRead] = useMutation(MARK_ALL_AS_READ, {
        refetchQueries: [
            { query: GET_MY_NOTIFICATIONS, variables: { limit: 50, offset: 0 } },
            { query: GET_UNREAD_NOTIFICATIONS_COUNT }
        ]
    });

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleCancelSelection = () => {
        setSelectedIds(new Set());
        setSelectionMode(false);
    };

    const handleToggleSelectAll = () => {
        const notifications = data?.getMyNotifications || [];
        if (selectedIds.size === notifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(notifications.map((n: any) => n.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        const idsArray = Array.from(selectedIds);
        try {
            await deleteNotifications({
                variables: { ids: idsArray }
            });
            setSelectedIds(new Set());
            setSelectionMode(false);
            Toast.show({
                type: 'success',
                text1: 'Avisos eliminados',
                text2: 'Las notificaciones seleccionadas fueron eliminadas.',
            });
        } catch (error) {
            console.error('Error deleting notifications:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudieron eliminar las notificaciones.',
            });
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            Toast.show({
                type: 'success',
                text1: 'Notificaciones leídas',
                text2: 'Todas las notificaciones se marcaron como leídas.',
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handlePressNotification = (item: any) => {
        if (selectionMode) {
            toggleSelect(item.id);
            return;
        }

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
                    if (parsedData.postId && (
                        parsedData.type === 'POST_DETAIL' ||
                        parsedData.type === 'STORE_DETAIL' ||
                        parsedData.type === 'JOB_DETAIL' ||
                        parsedData.type === 'SERVICE_DETAIL' ||
                        parsedData.type === 'COMMENT_DETAIL'
                    )) {
                        router.push({
                            pathname: '/postDetail',
                            params: { 
                                postId: parsedData.postId, 
                                isStore: parsedData.isStore || (parsedData.type === 'STORE_DETAIL' ? 'true' : 'false'),
                                itemType: parsedData.type,
                                isDeletedContent: parsedData.isDeletedContent === 'true' || parsedData.isDeletedContent === true ? 'true' : 'false',
                                moderatorNote: parsedData.moderatorNote || ''
                            }
                        });
                        return;
                    }
                    if (parsedData.detailed === true || parsedData.detailed === 'true' || (!parsedData.postId && !parsedData.userId && !parsedData.conversationId)) {
                        router.push({
                            pathname: '/notificationDetail',
                            params: { 
                                title: item.title, 
                                body: item.message, 
                                image: parsedData.image || '',
                                badgeText: parsedData.badgeText || 'OFICIAL',
                                createdAt: item.createdAt
                            }
                        });
                        return;
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

    const handleLongPressNotification = (item: any) => {
        if (!selectionMode) {
            setSelectionMode(true);
            setSelectedIds(new Set([item.id]));
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isUnread = !item.isRead;
        const isSelected = selectedIds.has(item.id);
        const bgColor = isSelected
            ? (isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.1)')
            : isUnread 
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

        const renderCheckbox = () => {
            if (!selectionMode) return null;
            return (
                <View style={styles.checkboxWrapper}>
                    <Ionicons 
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                        size={22} 
                        color={isSelected ? "#3B82F6" : colors.textSecondary} 
                    />
                </View>
            );
        };

        return (
            <TouchableOpacity 
                style={[styles.notificationCard, { backgroundColor: bgColor, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.2)' : colors.border }]}
                onPress={() => handlePressNotification(item)}
                onLongPress={() => handleLongPressNotification(item)}
                delayLongPress={400}
                activeOpacity={0.7}
            >
                {renderCheckbox()}
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
                {parsedData?.image && (
                    <Image source={{ uri: parsedData.image }} style={styles.notificationImage} />
                )}
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
                {selectionMode ? (
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={handleCancelSelection} style={styles.headerButton}>
                            <Ionicons name="close-outline" size={24} color={colors.text} />
                            <Text style={[styles.headerButtonText, { color: colors.text }]}>Cancelar</Text>
                        </TouchableOpacity>
                        
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            {selectedIds.size} {selectedIds.size === 1 ? 'seleccionado' : 'seleccionados'}
                        </Text>
                        
                        <TouchableOpacity onPress={handleToggleSelectAll} style={styles.headerButton}>
                            <Text style={[styles.headerButtonText, { color: '#3B82F6', fontWeight: '600' }]}>
                                {selectedIds.size === notifications.length ? 'Ninguno' : 'Todos'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
                        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                            {notifications.length > 0 && (
                                <>
                                    <TouchableOpacity 
                                        onPress={handleMarkAllAsRead} 
                                        style={styles.iconHeaderButton}
                                    >
                                        <Ionicons name="checkmark-done-outline" size={24} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => setSelectionMode(true)} 
                                        style={styles.iconHeaderButton}
                                    >
                                        <Ionicons name="checkbox-outline" size={22} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                )}
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
                    contentContainerStyle={{ paddingBottom: selectionMode ? 100 : 20 }}
                    refreshing={loading}
                    onRefresh={refetch}
                />
            )}

            {selectionMode && (
                <View style={[styles.footerBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                        style={[styles.deleteButton, selectedIds.size === 0 && { opacity: 0.5 }]} 
                        onPress={handleDeleteSelected}
                        disabled={selectedIds.size === 0}
                    >
                        <Ionicons name="trash-outline" size={20} color="white" />
                        <Text style={styles.deleteButtonText}>Eliminar ({selectedIds.size})</Text>
                    </TouchableOpacity>
                </View>
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
    },
    notificationImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginLeft: 12,
        backgroundColor: 'rgba(150, 150, 150, 0.1)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerButtonText: {
        fontSize: 15,
    },
    iconHeaderButton: {
        padding: 4,
    },
    checkboxWrapper: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    deleteButton: {
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        width: '80%',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
