import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Keyboard,
    Animated,
    Modal,
    Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../../navigation/AppNavigator';
import { useQuery, useMutation } from '@apollo/client';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_CHAT_MESSAGES, SEND_MESSAGE, GET_CONVERSATION } from '../graphql/chat.operations';
import * as Haptics from 'expo-haptics';

export default function ChatRoomScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { id_conversation } = route.params || {};
    const { user: currentUser } = useAuth() as any;
    const [messageText, setMessageText] = useState('');

    const screenWidth = Dimensions.get('window').width;

    // Query para obtener mensajes
    const { data, loading, error } = useQuery(GET_CHAT_MESSAGES, {
        variables: { id_conversation },
        skip: !id_conversation,
        pollInterval: 3000,
    });

    // Query para obtener info de la conversación (para el header)
    const { data: convData } = useQuery(GET_CONVERSATION, {
        variables: { id_conversation },
        skip: !id_conversation,
    });

    const otherUser = useMemo(() => {
        const participants = convData?.getConversation?.participants;
        return participants?.find((p: any) => p.user.id !== currentUser?.id)?.user || null;
    }, [convData, currentUser?.id]);

    // Mutación para enviar mensaje
    const [sendMessageMutation] = useMutation(SEND_MESSAGE, {
        update(cache, { data: { sendMessage } }) {
            const queryData: any = cache.readQuery({
                query: GET_CHAT_MESSAGES,
                variables: { id_conversation },
            });

            if (queryData && sendMessage) {
                const existingMessages = queryData.getChatMessages || [];
                // Evitar duplicados (especialmente entre el optimistic y el real)
                const isDuplicate = existingMessages.some((msg: any) => msg.id_message === sendMessage.id_message);

                if (!isDuplicate) {
                    cache.writeQuery({
                        query: GET_CHAT_MESSAGES,
                        variables: { id_conversation },
                        data: {
                            getChatMessages: [...existingMessages, sendMessage],
                        },
                    });
                }
            }
        },
    });

    const messages = useMemo(() => {
        if (!data?.getChatMessages) return [];
        const rawMessages = [...data.getChatMessages].reverse();
        
        // Inyectar separadores de fecha
        const grouped: any[] = [];
        let lastDate = '';

        rawMessages.forEach((msg, index) => {
            const date = new Date(msg.createdAt).toDateString();
            if (date !== lastDate) {
                grouped.push({ type: 'DATE_SEPARATOR', date, id: `date-${msg.id_message}` });
                lastDate = date;
            }
            grouped.push({ ...msg, type: 'MESSAGE', id: msg.id_message });
        });

        return grouped;
    }, [data]);

    const handleSend = async () => {
        if (!messageText.trim() || !id_conversation) return;

        const content = messageText.trim();
        setMessageText('');

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await sendMessageMutation({
                variables: { id_conversation, content },
                optimisticResponse: {
                    sendMessage: {
                        __typename: 'Message',
                        id_message: `temp-${Date.now()}`,
                        content,
                        createdAt: new Date().toISOString(),
                        isRead: false,
                        sender: {
                            __typename: 'User',
                            id: currentUser.id,
                        },
                    },
                },
            });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    // ── Lógica de Teclado Manual (Replica de CommentsModal) ──
    const keyboardOffset = useRef(new Animated.Value(insets.bottom)).current;

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        
        const showSub = Keyboard.addListener(showEvent, (e) => {
            Animated.timing(keyboardOffset, {
                // Sumamos 65px extra según tu feedback para que la barra suba completamente.
                toValue: e.endCoordinates.height + (Platform.OS === 'ios' ? 0 : 50),
                duration: Platform.OS === 'ios' ? e.duration : 150,
                useNativeDriver: false,
            }).start();
        });

        const hideSub = Keyboard.addListener(hideEvent, (e) => {
            Animated.timing(keyboardOffset, {
                toValue: insets.bottom,
                duration: Platform.OS === 'ios' ? e.duration : 150,
                useNativeDriver: false,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [insets.bottom]);

    const renderProfileSummary = () => {
        if (!otherUser) return null;

        return (
            <View style={styles.profileSummary}>
                <View style={styles.summaryAvatarContainer}>
                    {otherUser?.photoUrl ? (
                        <Image source={{ uri: otherUser.photoUrl }} style={styles.summaryAvatar} />
                    ) : (
                        <View style={[styles.summaryAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.summaryAvatarText, { color: colors.primary }]}>
                                {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.summaryName, { color: colors.text }]}>
                    {otherUser.firstName} {otherUser.lastName}
                </Text>
                <Text style={[styles.summaryUsername, { color: colors.textSecondary }]}>
                    @{otherUser.username}
                </Text>
                {otherUser.badge?.title && (
                    <View style={[styles.summaryBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.summaryBadgeText, { color: colors.primary }]}>
                            {otherUser.badge.title}
                        </Text>
                    </View>
                )}
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            </View>
        );
    };

    const renderMessage = ({ item, index }: { item: any, index: number }) => {
        if (item.type === 'DATE_SEPARATOR') {
            return (
                <View style={styles.dateSeparator}>
                    <View style={[styles.datePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            {new Date(item.date).toLocaleDateString([], { day: 'numeric', month: 'long' })}
                        </Text>
                    </View>
                </View>
            );
        }

        const isMine = item.sender?.id === currentUser?.id;
        
        // Logical check for grouping (Inverted list: index-1 is logically NEWER, index+1 is logically OLDER)
        const isNextSame = messages[index - 1]?.sender?.id === item.sender?.id;
        const isPrevSame = messages[index + 1]?.sender?.id === item.sender?.id;

        const bubbleStyles = [
            styles.bubble,
            isMine ? styles.myBubble : styles.theirBubble,
            {
                backgroundColor: isMine ? colors.primary : (isDark ? '#2C2C2E' : '#FFFFFF'),
                // Dynamic border radius for grouping
                borderTopRightRadius: isMine && isPrevSame ? 5 : 20,
                borderBottomRightRadius: isMine && isNextSame ? 5 : 20,
                borderTopLeftRadius: !isMine && isPrevSame ? 5 : 20,
                borderBottomLeftRadius: !isMine && isNextSame ? 5 : 20,
            }
        ];

        return (
            <View style={[
                styles.messageRow,
                isMine ? styles.myMessageRow : styles.theirMessageRow,
                { marginBottom: isNextSame ? 2 : 12 }
            ]}>
                <View style={bubbleStyles}>
                    <Text style={[
                        styles.messageText,
                        { color: isMine ? '#FFF' : colors.text }
                    ]}>
                        {item.content}
                    </Text>
                    <View style={styles.messageFooter}>
                        <Text style={[
                            styles.messageTime,
                            { color: isMine ? 'rgba(255,255,255,0.6)' : colors.textSecondary }
                        ]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </Text>
                        {isMine && (
                            <Ionicons 
                                name="checkmark-done" 
                                size={14} 
                                color="rgba(255,255,255,0.7)" 
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header Fijo */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.headerInfoContainer} 
                    onPress={() => navigation.navigate('ChatDetails', { id_conversation })}
                    activeOpacity={0.7}
                >
                    {otherUser?.photoUrl ? (
                        <Image source={{ uri: otherUser.photoUrl }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.headerAvatarText, { color: colors.primary }]}>
                                {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                            </Text>
                        </View>
                    )}
                    <View style={styles.headerTextContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                            {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Cargando...'}
                        </Text>
                        <View style={styles.onlineStatus}>
                            <View style={[styles.onlineDot, { backgroundColor: '#4CD964' }]} />
                            <Text style={[styles.onlineText, { color: colors.textSecondary }]}>En línea</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.headerAction}
                    onPress={() => navigation.navigate('ChatDetails', { id_conversation })}
                >
                    <Ionicons name="ellipsis-vertical" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Contenido con Desplazamiento de Teclado Manual */}
            <Animated.View style={{ flex: 1, paddingBottom: keyboardOffset }}>
                {/* Lista de Mensajes */}
                <View style={styles.chatContainer}>
                    {loading && !data ? (
                        <View style={styles.center}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            inverted={true}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            ListFooterComponent={renderProfileSummary}
                        />
                    )}
                </View>

                {/* Input de Mensajes */}
                <View style={[
                    styles.inputWrapper, 
                    { 
                        borderTopColor: colors.border, 
                        backgroundColor: colors.background,
                        paddingBottom: 10
                    }
                ]}>
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F7F7F7' }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Mensaje..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            value={messageText}
                            onChangeText={setMessageText}
                        />

                        <TouchableOpacity 
                            onPress={handleSend}
                            disabled={!messageText.trim()}
                            style={[
                                styles.sendButton, 
                                { backgroundColor: messageText.trim().length > 0 ? colors.primary : (isDark ? '#2C2C2E' : '#E5E5EA') }
                            ]}
                        >
                            <Ionicons 
                                name="arrow-up" 
                                size={20} 
                                color={messageText.trim().length > 0 ? "#FFF" : colors.textSecondary} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </View>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 8,
    },
    headerInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    headerAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerAvatarText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    onlineStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    onlineText: {
        fontSize: 12,
    },
    headerAction: {
        padding: 8,
    },
    chatContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        width: '100%',
    },
    myMessageRow: {
        justifyContent: 'flex-end',
    },
    theirMessageRow: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    myBubble: {
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    theirBubble: {
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 10,
        marginRight: 2,
        fontWeight: '500',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
    },
    inputWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    attachButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 15,
        maxHeight: 120,
        paddingTop: Platform.OS === 'ios' ? 8 : 4,
        paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    },
    sendButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    dateSeparator: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    datePill: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 15,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    profileSummary: {
        alignItems: 'center',
        paddingVertical: 40,
        marginBottom: 20,
    },
    summaryAvatarContainer: {
        marginBottom: 16,
    },
    summaryAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    summaryAvatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryAvatarText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    summaryName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    summaryUsername: {
        fontSize: 16,
        marginBottom: 12,
    },
    summaryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    summaryBadgeText: {
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    summaryDivider: {
        height: 1,
        width: '80%',
        marginTop: 30,
        opacity: 0.3,
    },
});
