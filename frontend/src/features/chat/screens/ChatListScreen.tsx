import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@apollo/client';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_USER_CONVERSATIONS } from '../graphql/chat.operations';

export default function ChatListScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const { user: currentUser } = useAuth() as any;

    const { data, loading, refetch } = useQuery(GET_USER_CONVERSATIONS, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 10000, // Refrescar cada 10s para ver nuevos chats
    });

    const getOtherParticipant = useCallback((participants: any[]) => {
        return participants?.find(p => p.user.id !== currentUser?.id)?.user || null;
    }, [currentUser?.id]);

    const formatChatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInDays === 1) {
            return 'Ayer';
        } else if (diffInDays < 7) {
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            return days[date.getDay()];
        } else {
            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
        }
    };

    const renderActiveUsers = () => {
        const users = data?.getUserConversations?.map((conv: any) => getOtherParticipant(conv.participants)) || [];
        
        return (
            <View style={styles.activeUsersSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Activos ahora</Text>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.activeUsersList}
                >
                    {users.map((user: any, index: number) => (
                        <TouchableOpacity key={index} style={styles.activeUserItem}>
                            <View style={styles.activeAvatarWrapper}>
                                {user?.photoUrl ? (
                                    <Image source={{ uri: user.photoUrl }} style={styles.activeAvatar} />
                                ) : (
                                    <View style={[styles.activeAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                        <Text style={[styles.activeAvatarText, { color: colors.primary }]}>{user?.firstName?.[0]}</Text>
                                    </View>
                                )}
                                <View style={[styles.onlineIndicator, { backgroundColor: '#4CD964', borderColor: colors.background }]} />
                            </View>
                            <Text style={[styles.activeUserName, { color: colors.text }]} numberOfLines={1}>
                                {user?.firstName}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderChatItem = ({ item }: { item: any }) => {
        const otherUser = getOtherParticipant(item.participants);
        if (!otherUser) return null;

        const lastMessage = item.lastMessage;

        return (
            <TouchableOpacity
                style={[styles.chatRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => (navigation as any).navigate('ChatRoom', { id_conversation: item.id_conversation })}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {otherUser.photoUrl ? (
                        <Image source={{ uri: otherUser.photoUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.avatarPlaceholderText, { color: colors.primary }]}>
                                {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.onlineStatusDot, { backgroundColor: '#4CD964', borderColor: colors.background }]} />
                </View>

                {/* Info */}
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                            {otherUser.firstName} {otherUser.lastName}
                        </Text>
                        <Text style={[styles.chatDate, { color: colors.textSecondary }]}>
                            {formatChatDate(lastMessage?.createdAt || item.updatedAt)}
                        </Text>
                    </View>
                    <View style={styles.chatFooter}>
                        <Text 
                            style={[
                                styles.lastMessage, 
                                { color: item.unreadCount > 0 ? colors.text : colors.textSecondary, fontWeight: item.unreadCount > 0 ? '700' : '400' }
                            ]} 
                            numberOfLines={1}
                        >
                            {lastMessage?.content || 'Iniciaste una conversación'}
                        </Text>
                        {/* Indicador de Unread */}
                        {item.unreadCount > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !data) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const conversations = data?.getUserConversations || [];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="camera-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput 
                        placeholder="Buscar chats..." 
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                    />
                </View>
            </View>

            {conversations.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="chatbubbles-outline" size={80} color={colors.primary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin mensajes aún</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Ve al perfil de alguien y rompe el hielo.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderChatItem}
                    keyExtractor={(item) => item.id_conversation}
                    contentContainerStyle={styles.listContainer}
                    ListHeaderComponent={renderActiveUsers}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => {}}
                activeOpacity={0.8}
            >
                <Ionicons name="create" size={28} color="#FFF" />
            </TouchableOpacity>
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    activeUsersSection: {
        paddingBottom: 20,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    activeUsersList: {
        paddingHorizontal: 15,
    },
    activeUserItem: {
        alignItems: 'center',
        width: 75,
    },
    activeAvatarWrapper: {
        position: 'relative',
        marginBottom: 6,
    },
    activeAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    activeAvatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeAvatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
    },
    activeUserName: {
        fontSize: 12,
        fontWeight: '500',
        width: '100%',
        textAlign: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    listContainer: {
        paddingBottom: 100,
    },
    chatRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 15,
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    onlineStatusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 15,
        height: 15,
        borderRadius: 7.5,
        borderWidth: 2,
    },
    chatInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        maxWidth: '70%',
    },
    chatDate: {
        fontSize: 12,
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        flex: 1,
        paddingRight: 10,
    },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
        opacity: 0.8,
    },
});
