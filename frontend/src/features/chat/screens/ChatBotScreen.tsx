import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TouchableWithoutFeedback,
    Alert,
    Image,
} from 'react-native';
import Reanimated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { apiClient } from '../../../api/axios.client';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export default function ChatBotScreen() {
    const { colors, isDark } = useTheme();
    const { user: currentUser } = useAuth() as any;
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `¡Hola, ${currentUser?.firstName ?? 'Usuario'}! 👋 Soy tu Asistente de Cantón. Estoy aquí para guiarte y responder tus preguntas sobre la comunidad. ¿En qué te puedo ayudar hoy?`,
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isActionModalVisible, setIsActionModalVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

    // useAnimatedKeyboard de Reanimated funciona con edgeToEdgeEnabled=true en Android
    // porque monitorea directamente la posición del teclado en el sistema, independientemente
    // de si la ventana hace resize o no.
    const keyboard = useAnimatedKeyboard();
    const keyboardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: -keyboard.height.value }],
    }));

    const handleLongPress = (message: Message) => {
        if (isSelectionMode) return;
        setSelectedMessage(message);
        setIsActionModalVisible(true);
    };

    const handlePressMessage = (message: Message) => {
        if (isSelectionMode) {
            setSelectedMessageIds(prev => {
                const next = new Set(prev);
                if (next.has(message.id)) {
                    next.delete(message.id);
                } else {
                    next.add(message.id);
                }
                return next;
            });
        }
    };

    const startSelectionMode = () => {
        setIsActionModalVisible(false);
        if (selectedMessage) {
            setIsSelectionMode(true);
            setSelectedMessageIds(new Set([selectedMessage.id]));
        }
    };

    const handleBulkDeleteConfirm = () => {
        if (selectedMessageIds.size === 0) return;
        Alert.alert(
            'Eliminar mensajes',
            `¿Estás seguro de que quieres eliminar los ${selectedMessageIds.size} mensajes seleccionados? Se borrarán de la vista y del contexto del asistente.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Eliminar', 
                    style: 'destructive',
                    onPress: handleBulkDelete
                }
            ]
        );
    };

    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(selectedMessageIds);
        const messagesToDelete = messages.filter(m => idsToDelete.includes(m.id));
        
        setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)));
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());

        try {
            await apiClient.delete('/chatbot/messages/bulk', {
                data: {
                    messages: messagesToDelete.map(m => ({
                        text: m.text,
                        sender: m.sender
                    }))
                }
            });
        } catch (error) {
            console.error('Error al eliminar mensajes en lote del chatbot:', error);
        }
    };

    const resolveMediaUrl = (url?: string | null) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('file://')) return url;
        const serverUrl = 'https://canton-enterprise-production.up.railway.app';
        return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Cargar historial de conversación al entrar a la pantalla
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await apiClient.get('/chatbot/conversation');
                if (res.data && res.data.messages && res.data.messages.length > 0) {
                    const chatMessages = res.data.messages
                        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
                        .map((m: any, index: number) => ({
                            id: `history_${index}_${Date.now()}`,
                            text: m.content,
                            sender: m.role === 'user' ? 'user' : 'bot' as 'user' | 'bot',
                            timestamp: new Date(),
                        }));

                    if (chatMessages.length > 0) {
                        setMessages(chatMessages);
                    }
                }
            } catch (error) {
                console.error('Error al cargar historial del chatbot:', error);
            }
        };
        loadHistory();
    }, []);

    // Sugerencias rápidas
    const suggestions = [
        { id: 'jobs', label: '💼 Ver Empleos', text: '¿Qué ofertas de empleo hay disponibles?' },
        { id: 'store', label: '🛒 Explorar Tienda', text: '¿Qué puedo encontrar en la tienda?' },
        { id: 'info', label: 'ℹ️ Sobre la App', text: '¿Para qué sirve esta aplicación?' },
    ];

    const handleSend = async (textToSend = inputText) => {
        if (!textToSend.trim() || isTyping) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputText('');
        setIsTyping(true);

        try {
            const res = await apiClient.post('/chatbot/message', { text: textToSend });
            const botReply = res.data.response;
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    text: botReply,
                    sender: 'bot',
                    timestamp: new Date(),
                },
            ]);
        } catch (error) {
            console.error('Error al llamar al chatbot API:', error);
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    text: 'Lo siento, tuve un problema de conexión al procesar tu consulta con la IA. Por favor, vuelve a intentarlo en unos instantes.',
                    sender: 'bot',
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleClearConversation = async () => {
        try {
            await apiClient.delete('/chatbot/conversation');
            setMessages([
                {
                    id: '1',
                    text: `¡Hola, ${currentUser?.firstName ?? 'Usuario'}! 👋 Soy tu Asistente de Cantón. He reiniciado nuestra conversación. ¿En qué te puedo ayudar hoy?`,
                    sender: 'bot',
                    timestamp: new Date(),
                },
            ]);
        } catch (error) {
            console.error('Error al vaciar la conversación:', error);
        }
    };

    // Auto-scroll al final al recibir o enviar mensajes
    useEffect(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages, isTyping]);

    const renderMessageItem = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageRow,
                isUser ? styles.userRow : styles.botRow
            ]}>
                {isSelectionMode && (
                    <TouchableOpacity 
                        onPress={() => handlePressMessage(item)}
                        style={{ marginRight: 10, alignSelf: 'center' }}
                    >
                        <Ionicons 
                            name={selectedMessageIds.has(item.id) ? "checkmark-circle" : "ellipse-outline"} 
                            size={22} 
                            color={selectedMessageIds.has(item.id) ? "#FF3B30" : colors.textSecondary} 
                        />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handlePressMessage(item)}
                    onLongPress={() => handleLongPress(item)}
                    style={[
                        styles.bubble,
                        isUser 
                            ? [styles.userBubble, { backgroundColor: isDark ? '#1C1C1E' : '#EAEAEA', maxWidth: '75%' }] 
                            : [styles.botBubble, { backgroundColor: '#000000', maxWidth: '100%', width: '100%' }],
                        isSelectionMode && selectedMessageIds.has(item.id) && {
                            borderWidth: 2,
                            borderColor: '#FF3B30',
                        }
                    ]}
                >
                    <Text style={[
                        styles.messageText,
                        { color: isUser ? colors.text : '#FFFFFF' }
                    ]}>
                        {item.text}
                    </Text>
                </TouchableOpacity>
                {isUser && (
                    currentUser?.photoUrl || currentUser?.avatarUrl ? (
                        <Image
                            source={{ uri: resolveMediaUrl(currentUser?.photoUrl || currentUser?.avatarUrl) }}
                            style={[styles.avatarContainer, { marginLeft: 8, marginRight: 0 }]}
                        />
                    ) : (
                        <View style={[styles.avatarContainer, { backgroundColor: colors.primary, marginLeft: 8, marginRight: 0 }]}>
                            <Text style={styles.avatarInitialText}>
                                {currentUser?.firstName?.[0]?.toUpperCase() ?? 'U'}
                            </Text>
                        </View>
                    )
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            {isSelectionMode ? (
                <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                        style={styles.headerSelectionBtn}
                        onPress={() => {
                            setIsSelectionMode(false);
                            setSelectedMessageIds(new Set());
                        }}
                    >
                        <Text style={[styles.cancelText, { color: colors.primary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {selectedMessageIds.size} {selectedMessageIds.size === 1 ? 'seleccionado' : 'seleccionados'}
                    </Text>
                    <TouchableOpacity
                        style={styles.headerSelectionBtn}
                        onPress={handleBulkDeleteConfirm}
                        disabled={selectedMessageIds.size === 0}
                    >
                        <Ionicons 
                            name="trash-outline" 
                            size={22} 
                            color={selectedMessageIds.size === 0 ? colors.textSecondary + '40' : '#FF3B30'} 
                        />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerTitleContainer}>
                        <View style={[styles.headerAvatar, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
                            <Image 
                                source={require('../../../../assets/chunchi-city-images/fynnux-corte-512x512.png')} 
                                style={{ width: 40, height: 40, resizeMode: 'contain' }} 
                            />
                        </View>
                        <View>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>FynnuX IA - Asistente</Text>
                            <View style={styles.statusRow}>
                                <View style={styles.onlineDot} />
                                <Text style={[styles.statusText, { color: colors.textSecondary }]}>En línea • IA</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClearConversation}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            <Reanimated.View style={[styles.keyboardContainer, keyboardAnimatedStyle]}>
                {/* Message List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessageItem}
                    contentContainerStyle={styles.listContent}
                    ListFooterComponent={
                        isTyping ? (
                            <View style={[styles.messageRow, styles.botRow]}>
                                <View style={[styles.bubble, styles.botBubble, { backgroundColor: '#000000', paddingVertical: 12, maxWidth: '100%', width: '100%' }]}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            </View>
                        ) : null
                    }
                />

                {/* Sugerencias Rápidas */}
                {messages.length === 1 && (
                    <View style={styles.suggestionsContainer}>
                        <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>Sugerencias rápidas:</Text>
                        <View style={styles.suggestionsRow}>
                            {suggestions.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.suggestionChip, { borderColor: colors.primary, backgroundColor: colors.primary + '08' }]}
                                    onPress={() => handleSend(s.text)}
                                >
                                    <Text style={[styles.suggestionChipText, { color: colors.primary }]}>{s.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Input Area */}
                <View style={[
                    styles.inputContainer,
                    {
                        borderTopColor: colors.border,
                        backgroundColor: colors.surface,
                    }
                ]}>
                    <TextInput
                        style={[styles.input, { color: colors.text, backgroundColor: isDark ? colors.background : '#F5F5F5' }]}
                        placeholder="Pregúntale algo al asistente..."
                        placeholderTextColor={colors.textSecondary}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: inputText.trim() ? colors.primary : colors.textSecondary + '40' }]}
                        onPress={() => handleSend()}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="send" size={18} color="white" />
                    </TouchableOpacity>
                </View>
            </Reanimated.View>
            <Modal
                visible={isActionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsActionModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsActionModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.modalTitle, { color: colors.textSecondary }]}>Opciones de mensaje</Text>
                                
                                <TouchableOpacity 
                                    style={[styles.modalOption, { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
                                    onPress={async () => {
                                        if (selectedMessage) {
                                            await Clipboard.setStringAsync(selectedMessage.text);
                                            Toast.show({
                                                type: 'success',
                                                text1: 'Copiado',
                                                text2: 'El texto ha sido copiado al portapapeles',
                                                position: 'top',
                                                visibilityTime: 2000,
                                            });
                                        }
                                        setIsActionModalVisible(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="copy-outline" size={20} color={colors.text} style={styles.modalIcon} />
                                    <Text style={[styles.modalOptionText, { color: colors.text }]}>Copiar texto</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.modalOption} 
                                    onPress={startSelectionMode}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FF3B30" style={styles.modalIcon} />
                                    <Text style={[styles.modalOptionText, { color: '#FF3B30', fontWeight: '600' }]}>Eliminar mensaje</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CD964',
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
    },
    keyboardContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        paddingBottom: 10,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    botRow: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 4,
    },
    bubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    botBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    suggestionsContainer: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    suggestionsTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    suggestionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestionChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    suggestionChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        marginBottom: 2,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 100,
        fontSize: 14,
        marginRight: 10,
    },
    sendButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'stretch',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    modalIcon: {
        marginRight: 12,
    },
    modalOptionText: {
        fontSize: 15,
    },
    headerSelectionBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
    avatarInitialText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
