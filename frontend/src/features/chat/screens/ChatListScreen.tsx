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
    Modal,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { GET_USER_CONVERSATIONS, DELETE_CONVERSATION_FOR_ME, INBOX_UPDATE_SUBSCRIPTION, GET_OR_CREATE_CHAT } from '../graphql/chat.operations';
import { GET_ONLINE_FOLLOWING, GET_ONLINE_FOLLOWING_COUNT } from '../../follows/graphql/follows.operations';
import { useQuery, useMutation, useSubscription, useApolloClient } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { OnlineStatusIndicator } from '../components/OnlineStatusIndicator';
import { getUserOnlineStatus } from '../../../utils/presence';
import Toast from 'react-native-toast-message';

export default function ChatListScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const { user: currentUser } = useAuth() as any;
    const client = useApolloClient();

    const [selectedConversation, setSelectedConversation] = React.useState<any>(null);
    const [isMenuVisible, setIsMenuVisible] = React.useState(false);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = React.useState(false);

    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    const { data: queryData, loading, refetch } = useQuery<any>(GET_USER_CONVERSATIONS, {
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: false,
        pollInterval: 60000, // Tarea 2: 1 minuto para actualizar silenciosamente presencias (Offline -> Online)
    });

    const { data: onlineData, refetch: refetchOnline } = useQuery<any>(GET_ONLINE_FOLLOWING, {
        skip: !currentUser?.id,
        fetchPolicy: 'cache-and-network',
        pollInterval: 60000,
    });

    const { data: onlineCountData, refetch: refetchOnlineCount } = useQuery<any>(GET_ONLINE_FOLLOWING_COUNT, {
        skip: !currentUser?.id,
        fetchPolicy: 'cache-and-network',
        pollInterval: 60000,
    });

    const [conversations, setConversations] = React.useState<any[]>([]);

    // Sincronizar estado local con datos de la query (cache-and-network)
    React.useEffect(() => {
        if (queryData?.getUserConversations) {
            setConversations(queryData.getUserConversations);
        }
    }, [queryData]);

    // Subscription para actualizaciones en tiempo real de TODA la bandeja de entrada
    useSubscription(INBOX_UPDATE_SUBSCRIPTION, {
        onData: ({ data: subResult }: any) => {
            const newMsg = subResult?.data?.inboxUpdate;
            if (!newMsg) return;

            setConversations(prev => {
                const existingIndex = prev.findIndex(c => c.id === newMsg.conversationId);
                
                if (existingIndex > -1) {
                    // Actualizar conversación existente
                    const updatedConv = { ...prev[existingIndex] };
                    updatedConv.lastMessage = newMsg;
                    updatedConv.updatedAt = newMsg.createdAt;
                    
                    // Incrementar contador si el mensaje es de otra persona
                    if (newMsg.sender.id !== currentUser?.id) {
                        updatedConv.unreadCount = (updatedConv.unreadCount || 0) + 1;
                    }

                    const others = prev.filter(c => c.id !== newMsg.conversationId);
                    return [updatedConv, ...others]; // Mover al tope
                } else {
                    // Chat nuevo que no estaba en la lista: Refrescamos para obtener toda la info del participante
                    refetch();
                    return prev;
                }
            });
        }
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([refetch(), refetchOnline(), refetchOnlineCount()]);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Al volver de un ChatRoom, refrescamos la lista para mostrar el último mensaje actualizado.
    // Esto reemplaza el pollInterval eliminado — es más eficiente porque solo corre al enfocar la pantalla.
    useFocusEffect(
        useCallback(() => {
            refetch();
            refetchOnline();
            refetchOnlineCount();
        }, [refetch, refetchOnline, refetchOnlineCount])
    );

    const [deleteConversationForMeMutation] = useMutation(DELETE_CONVERSATION_FOR_ME);

    const handleConfirmDelete = async () => {
        setIsConfirmModalVisible(false);
        if (!selectedConversation) return;

        try {
            await deleteConversationForMeMutation({ 
                variables: { conversationId: selectedConversation.id },
                refetchQueries: [{ query: GET_USER_CONVERSATIONS }]
            });
            client.cache.evict({ id: `Conversation:${selectedConversation.id}` });
            client.cache.gc();
            Toast.show({ type: 'success', text1: 'Éxito', text2: 'Conversación eliminada.' });
        } catch (err) {
            console.error("Error al eliminar conversación:", err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar la conversación.' });
        }
    };

    const getOtherParticipant = useCallback((participants: any[]) => {
        if (!participants || participants.length === 0) return null;
        const other = participants.find(p => p.user.id !== currentUser?.id);
        return other ? other.user : participants[0].user; // Si no hay otro, es un chat propio, devolvemos a sí mismo
    }, [currentUser?.id]);

    const filteredConversations = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        
        const query = searchQuery.toLowerCase();
        return conversations.filter(conv => {
            const otherUser = getOtherParticipant(conv.participants);
            if (!otherUser) return false;
            
            const fullName = `${otherUser.firstName} ${otherUser.lastName}`.toLowerCase();
            const username = (otherUser.username || '').toLowerCase();
            
            return fullName.includes(query) || username.includes(query);
        });
    }, [conversations, searchQuery, getOtherParticipant]);

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

    const [createChatMutation] = useMutation(GET_OR_CREATE_CHAT);

    const handleOpenSelfChat = async () => {
        if (!currentUser?.id) return;
        try {
            const result = await createChatMutation({
                variables: { targetUserId: currentUser.id }
            });
            const conversationId = (result.data as any).getOrCreateOneOnOneChat.id;
            router.push({
                pathname: '/chatRoom',
                params: { conversationId }
            });
        } catch (err) {
            console.error("Error al abrir chat propio:", err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo crear el chat personal' });
        }
    };

    const handleOpenDirectChat = async (userId: string, existingConversationId?: string) => {
        if (existingConversationId) {
            router.push({
                pathname: '/chatRoom',
                params: { conversationId: existingConversationId }
            });
            return;
        }
        try {
            const result = await createChatMutation({
                variables: { targetUserId: userId }
            });
            const conversationId = (result.data as any).getOrCreateOneOnOneChat.id;
            router.push({
                pathname: '/chatRoom',
                params: { conversationId }
            });
        } catch (err) {
            console.error("Error al abrir chat:", err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el chat' });
        }
    };

    const renderActiveUsers = () => {
        // Obtenemos los usuarios ya filtrados y limitados desde el backend
        const activeUsersList = onlineData?.getOnlineFollowing || [];
        const totalOnlineCount = onlineCountData?.getOnlineFollowingCount || 0;
        
        // Remover duplicados (por si acaso) y a nosotros mismos
        const uniqueActiveUsers = Array.from(new Map(activeUsersList.map((user: any) => [user.id, user])).values())
            .filter((u: any) => u.id !== currentUser?.id);
        
        return (
            <View style={styles.activeUsersSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Activos ahora ({totalOnlineCount})</Text>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.activeUsersList}
                >
                    {/* El nodo de Tú (Self Chat) usando el perfil del currentUser */}
                    <TouchableOpacity style={styles.activeUserItem} onPress={handleOpenSelfChat}>
                        <View style={styles.activeAvatarWrapper}>
                            {currentUser?.photoUrl ? (
                                <Image source={{ uri: currentUser.photoUrl }} style={styles.activeAvatar} />
                            ) : (
                                <View style={[styles.activeAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.activeAvatarText, { color: colors.primary }]}>{currentUser?.firstName?.[0]}</Text>
                                </View>
                            )}
                            <OnlineStatusIndicator 
                                lastActiveAt={new Date().toISOString()} // Tú siempre estás activo
                                style={styles.onlineIndicator} 
                            />
                        </View>
                        <Text style={[styles.activeUserName, { color: colors.text }]} numberOfLines={1}>
                            Tú
                        </Text>
                    </TouchableOpacity>

                    {uniqueActiveUsers.map((user: any, index: number) => (
                        <TouchableOpacity 
                            key={user.id || index} 
                            style={styles.activeUserItem}
                            onPress={() => handleOpenDirectChat(user.id)}
                        >
                            <View style={styles.activeAvatarWrapper}>
                                {user.photoUrl ? (
                                    <Image source={{ uri: user.photoUrl }} style={styles.activeAvatar} />
                                ) : (
                                    <View style={[styles.activeAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                        <Text style={[styles.activeAvatarText, { color: colors.primary }]}>{user.firstName?.[0]}</Text>
                                    </View>
                                )}
                                <OnlineStatusIndicator 
                                    lastActiveAt={user.lastActiveAt} 
                                    style={styles.onlineIndicator} 
                                />
                            </View>

                            <Text style={[styles.activeUserName, { color: colors.text }]} numberOfLines={1}>
                                {user.firstName}
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
                onPress={() => router.push({
                    pathname: '/chatRoom',
                    params: { conversationId: item.id }
                })}
                onLongPress={() => {
                    setSelectedConversation(item);
                    setIsMenuVisible(true);
                }}
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
                    <OnlineStatusIndicator 
                        lastActiveAt={otherUser.lastActiveAt} 
                        style={styles.onlineStatusDot} 
                    />
                </View>

                {/* Info */}
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                            {otherUser.firstName} {otherUser.lastName} {otherUser.id === currentUser?.id ? '(Tú)' : ''}
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
                            {lastMessage?.videoUrl && !lastMessage?.content 
                                ? '📹 Video' 
                                : lastMessage?.videoUrl && lastMessage?.content 
                                    ? `📹 ${lastMessage.content}` 
                                    : lastMessage?.imageUrl && !lastMessage?.content 
                                        ? '📷 Imagen' 
                                        : lastMessage?.imageUrl && lastMessage?.content 
                                            ? `📷 ${lastMessage.content}` 
                                            : lastMessage?.content || 'Iniciaste una conversación'}
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

    if (loading && conversations.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput 
                        placeholder="Buscar chats..." 
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
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
                    data={filteredConversations}
                    renderItem={renderChatItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListHeaderComponent={renderActiveUsers}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => (navigation as any).navigate('NewChat')}
                activeOpacity={0.8}
            >
                <Ionicons name="create" size={28} color="#FFF" />
            </TouchableOpacity>

            {/* Modal de Menú de Opciones (Long Press) */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setIsMenuVisible(false)}
                >
                    <View style={[styles.actionModalContainer, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity 
                            style={styles.actionModalBtn}
                            onPress={() => {
                                setIsMenuVisible(false);
                                setIsConfirmModalVisible(true);
                            }}
                        >
                            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                            <Text style={[styles.actionModalText, { color: '#FF3B30' }]}>Eliminar conversación</Text>
                        </TouchableOpacity>
                        
                        <View style={[styles.actionModalDivider, { backgroundColor: colors.border }]} />
                        
                        <TouchableOpacity 
                            style={styles.actionModalBtn}
                            onPress={() => setIsMenuVisible(false)}
                        >
                            <Ionicons name="close-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionModalText, { color: colors.text }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal de Confirmación Estilizado */}
            <Modal
                visible={isConfirmModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsConfirmModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.confirmModalContainer, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.confirmModalTitle, { color: colors.text }]}>Eliminar conversación</Text>
                        <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                            ¿Estás seguro de que deseas eliminar esta conversación con {getOtherParticipant(selectedConversation?.participants)?.firstName}? Esta acción se aplicará solo para ti.
                        </Text>
                        
                        <View style={[styles.confirmModalActions, { borderTopColor: colors.border }]}>
                            <TouchableOpacity 
                                style={[styles.confirmModalBtn, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border }]}
                                onPress={() => setIsConfirmModalVisible(false)}
                            >
                                <Text style={[styles.confirmModalBtnText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.confirmModalBtn}
                                onPress={handleConfirmDelete}
                            >
                                <Text style={[styles.confirmModalBtnText, { color: '#FF3B30', fontWeight: 'bold' }]}>
                                    Eliminar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionModalContainer: {
        width: '85%',
        borderRadius: 20,
        paddingVertical: 10,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    actionModalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 25,
    },
    actionModalText: {
        fontSize: 16,
        marginLeft: 15,
        fontWeight: '600',
    },
    actionModalDivider: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    confirmModalContainer: {
        width: '80%',
        borderRadius: 20,
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    confirmModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    confirmModalMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    confirmModalActions: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
        width: '100%',
    },
    confirmModalBtn: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmModalBtnText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
