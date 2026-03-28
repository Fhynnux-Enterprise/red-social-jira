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
    Alert,
    PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../../navigation/AppNavigator';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_CHAT_MESSAGES, SEND_MESSAGE, GET_CONVERSATION, DELETE_MESSAGE_FOR_ME, DELETE_MESSAGE_FOR_ALL, EDIT_MESSAGE, SEARCH_MESSAGES_IN_CHAT, MESSAGE_ADDED_SUBSCRIPTION } from '../graphql/chat.operations';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { Video as VideoCompressor } from 'react-native-compressor';
import { ChatBubbleVideo } from '../components/ChatBubbleVideo';
import ZoomableImageViewer from '../../feed/components/ZoomableImageViewer';
import { ActualFullscreenVideo } from '../../feed/components/ActualFullscreenVideo';

export default function ChatRoomScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { id_conversation } = route.params || {};
    const { user: currentUser } = useAuth() as any;
    const [messageText, setMessageText] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [isActionModalVisible, setIsActionModalVisible] = useState(false);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({
        title: '',
        message: '',
        confirmText: '',
        onConfirm: () => {}
    });
    
    // Estados de búsqueda
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

    const flatListRef = useRef<FlatList>(null);
    const client = useApolloClient();
    const { pickImage, uploadMedia } = useMediaUpload();
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);

    const screenWidth = Dimensions.get('window').width;

    const MESSAGES_LIMIT = 20;
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Query para obtener mensajes (Sin pollInterval ya que usamos WebSockets)
    const { data, loading, error, fetchMore, subscribeToMore } = useQuery(GET_CHAT_MESSAGES, {
        variables: { id_conversation, limit: MESSAGES_LIMIT, offset: 0 },
        skip: !id_conversation,
    });

    // Subscripción a nuevos mensajes
    useEffect(() => {
        if (!id_conversation) return;

        const unsubscribe = subscribeToMore({
            document: MESSAGE_ADDED_SUBSCRIPTION,
            variables: { id_conversation },
            updateQuery: (prev: any, { subscriptionData }: any) => {
                if (!subscriptionData.data) return prev;
                const newMessage = subscriptionData.data.messageAdded;
                
                // Prevenimos duplicación si la mutación sendMessage ya actualizó la caché local
                const exists = prev.getChatMessages.find((m: any) => m.id_message === newMessage.id_message);
                if (exists) return prev;

                // El arreglo está ordenado DESC (los nuevos van al frente)
                return Object.assign({}, prev, {
                    getChatMessages: [newMessage, ...prev.getChatMessages]
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [id_conversation, subscribeToMore]);

    const loadOlderMessages = async () => {
        // Freno: No cargar si ya se está cargando o si ya no hay más mensajes
        if (isFetchingMore || !hasMore) return;

        setIsFetchingMore(true);
        try {
            const currentCount = data?.getChatMessages?.length || 0;
            const { data: moreData } = await fetchMore({
                variables: {
                    offset: currentCount,
                },
            }) as any;

            const newCount = moreData?.getChatMessages?.length || 0;

            // Si el servidor no devolvió mensajes nuevos, la longitud total no crecerá en MESSAGES_LIMIT
            if (!moreData?.getChatMessages || (newCount - currentCount) < MESSAGES_LIMIT) {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Error cargando historial de chat:", e);
            setHasMore(false); // Para no ciclar el error
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Reseteamos el paginado cuando cambiamos de chat
    useEffect(() => {
        setHasMore(true);
    }, [id_conversation]);

    // Verificación segura en la carga inicial
    useEffect(() => {
        if (data?.getChatMessages && data.getChatMessages.length < MESSAGES_LIMIT) {
            setHasMore(false);
        }
    }, [data?.getChatMessages?.length]);

    // Query para obtener info de la conversación (para el header)
    const { data: convData } = useQuery(GET_CONVERSATION, {
        variables: { id_conversation },
        skip: !id_conversation,
    });

    const otherUser = useMemo(() => {
        const participants = convData?.getConversation?.participants;
        return participants?.find((p: any) => p.user.id !== currentUser?.id)?.user || null;
    }, [convData, currentUser?.id]);

    const [deleteMessageForMeMutation] = useMutation(DELETE_MESSAGE_FOR_ME);
    const [deleteMessageForAllMutation] = useMutation(DELETE_MESSAGE_FOR_ALL);
    const [editMessageMutation] = useMutation(EDIT_MESSAGE);

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
                            getChatMessages: [sendMessage, ...existingMessages],
                        },
                    });
                }
            }
        },
    });

    const messages = useMemo(() => {
        if (!data?.getChatMessages) return [];
        // rawMessages: del más nuevo (index 0) al más viejo
        const rawMessages = [...data.getChatMessages].reverse();
        
        const grouped: any[] = [];

        rawMessages.forEach((msg, index) => {
            // Empujar el mensaje actual (siendo FlatList invertido, se pinta de abajo hacia arriba)
            grouped.push({ ...msg, type: 'MESSAGE', id: msg.id_message });
            
            // Checar la fecha del mensaje que sigue (que cronológicamente es más viejo)
            const currentDate = new Date(msg.createdAt).toDateString();
            const nextMsg = rawMessages[index + 1];
            const nextDate = nextMsg ? new Date(nextMsg.createdAt).toDateString() : null;

            // Si el siguiente mensaje tiene fecha diferente (o no hay siguiente, o sea este es el más antiguo)
            // Agregamos el separador. Como FlatList invierte, este separador quedará VISUALMENTE ARRIBA de este mensaje.
            if (currentDate !== nextDate) {
                grouped.push({ type: 'DATE_SEPARATOR', date: msg.createdAt, id: `date-${currentDate}` });
            }
        });

        return grouped;
    }, [data]);

    const handleSend = async () => {
        const hasText = messageText.trim().length > 0;
        const hasMedia = !!imagePreview || !!videoPreview;
        if ((!hasText && !hasMedia) || !id_conversation) return;

        const content = messageText.trim();
        const pendingImage = imagePreview;
        const pendingVideo = videoPreview;
        setMessageText('');
        setImagePreview(null);
        setVideoPreview(null);

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (editingMessage) {
                await editMessageMutation({
                    variables: { id_message: editingMessage.id_message, newContent: content },
                });
                setEditingMessage(null);
                return;
            }

            let uploadedImageUrl: string | undefined;
            let uploadedVideoUrl: string | undefined;

            // Subir imagen
            if (pendingImage) {
                setIsUploadingMedia(true);
                setUploadStatusText('Subiendo imagen...');
                try {
                    const ext = pendingImage.split('.').pop() || 'jpg';
                    const mimeType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;
                    uploadedImageUrl = await uploadMedia(pendingImage, mimeType, 'chat-images');
                } catch (uploadErr) {
                    console.error('Error uploading image:', uploadErr);
                    Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo subir la imagen' });
                    setIsUploadingMedia(false);
                    setUploadStatusText('');
                    return;
                }
            }

            // Comprimir y subir video
            if (pendingVideo) {
                setIsUploadingMedia(true);
                setUploadStatusText('Comprimiendo video...');
                try {
                    const compressedUri = await VideoCompressor.compress(pendingVideo, {
                        compressionMethod: 'auto',
                        maxSize: 720,
                    });
                    setUploadStatusText('Subiendo video...');
                    uploadedVideoUrl = await uploadMedia(compressedUri, 'video/mp4', 'chat-videos');
                } catch (uploadErr) {
                    console.error('Error uploading video:', uploadErr);
                    Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo subir el video' });
                    setIsUploadingMedia(false);
                    setUploadStatusText('');
                    return;
                }
            }

            setIsUploadingMedia(false);
            setUploadStatusText('');

            await sendMessageMutation({
                variables: {
                    id_conversation,
                    content: content || '',
                    imageUrl: uploadedImageUrl || undefined,
                    videoUrl: uploadedVideoUrl || undefined,
                },
                optimisticResponse: {
                    sendMessage: {
                        __typename: 'Message',
                        id_message: `temp-${Date.now()}`,
                        content: content || '',
                        imageUrl: uploadedImageUrl || null,
                        videoUrl: uploadedVideoUrl || null,
                        createdAt: new Date().toISOString(),
                        isRead: false,
                        isDeletedForAll: false,
                        editedAt: null,
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

    const handlePickMedia = async () => {
        try {
            // Tarea 2: Usar editor integrado de expo-image-picker
            const result = await pickImage(true, 'All', 60, 0.7);
            if (result) {
                if (result.mimeType?.startsWith('video')) {
                    // Validar duración (máx 60 segundos)
                    // expo-image-picker entrega la duración en milisegundos en versiones recientes
                    const durationInSeconds = result.duration ? (result.duration > 1000 ? result.duration / 1000 : result.duration) : 0;
                    
                    if (durationInSeconds > 60.5) {
                        Toast.show({
                            type: 'error',
                            text1: 'Video muy largo',
                            text2: 'Solo se permiten videos de hasta 1 minuto.'
                        });
                        return;
                    }
                    
                    setVideoPreview(result.localUri);
                    setImagePreview(null);
                } else {
                    setImagePreview(result.localUri);
                    setVideoPreview(null);
                }
            }
        } catch (error: any) {
            if (error.message?.includes('denegados')) {
                Toast.show({ type: 'error', text1: 'Permisos', text2: 'Permite el acceso a tu galería' });
            }
        }
    };

    // Lógica de Búsqueda
    const { refetch: searchMessagesQuery, loading: searchLoading } = useQuery(SEARCH_MESSAGES_IN_CHAT, {
        variables: { id_conversation, searchTerm: '' },
        skip: true,
    });

    useEffect(() => {
        if (!isSearchMode) {
            setSearchTerm('');
            setSearchResults([]);
            setCurrentSearchIndex(0);
            return;
        }
    }, [isSearchMode]);

    useEffect(() => {
        const performSearch = async () => {
            if (searchTerm.trim().length > 1) {
                const { data } = await searchMessagesQuery({ id_conversation, searchTerm });
                const ids = data?.searchMessagesInChat?.map((m: any) => m.id_message) || [];
                setSearchResults(ids);
                setCurrentSearchIndex(0);
                if (ids.length > 0) jumpToMatch(0, ids);
            } else {
                setSearchResults([]);
            }
        };

        const timer = setTimeout(performSearch, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const jumpToMatch = (index: number, idsOverride?: string[]) => {
        const targetIds = idsOverride || searchResults;
        if (targetIds.length === 0) return;
        
        const messageId = targetIds[index];
        const flatListIndex = messages.findIndex(m => m.id === messageId);
        
        if (flatListIndex !== -1) {
            flatListRef.current?.scrollToIndex({
                index: flatListIndex,
                animated: true,
                viewPosition: 0.5
            });
        }
    };

    const handleScrollToIndexFailed = (error: any) => {
        const offset = error.averageItemLength * error.index;
        flatListRef.current?.scrollToOffset({ offset, animated: false });
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: error.index, animated: true });
        }, 100);
    };

    const HighlightedText = ({ text, sub, mine }: { text: string, sub: string, mine: boolean }) => {
        if (!isSearchMode || !sub.trim() || !text) {
            return <Text style={[styles.messageText, { color: mine ? '#FFF' : colors.text }]}>{text}</Text>;
        }

        const parts = text.split(new RegExp(`(${sub})`, 'gi'));
        return (
            <Text style={[styles.messageText, { color: mine ? '#FFF' : colors.text }]}>
                {parts.map((part, i) => 
                    part.toLowerCase() === sub.toLowerCase() ? (
                        <Text key={i} style={{ backgroundColor: '#FFF59D', color: '#000' }}>{part}</Text>
                    ) : (
                        <Text key={i}>{part}</Text>
                    )
                )}
            </Text>
        );
    };

    const handleHideMessageFromUI = (msgId: string) => {
        try {
            const queryData: any = client.readQuery({
                query: GET_CHAT_MESSAGES,
                variables: { id_conversation },
            });

            if (queryData) {
                const newMessages = queryData.getChatMessages.filter(
                    (msg: any) => msg.id_message !== msgId
                );
                
                client.writeQuery({
                    query: GET_CHAT_MESSAGES,
                    variables: { id_conversation },
                    data: {
                        getChatMessages: newMessages,
                    },
                });
            }
        } catch (e) {
            console.error("Error al actualizar la cache para ocultar el mensaje", e);
        }
    };

    const handleTombstoneMessageFromUI = (msgId: string) => {
        try {
            const queryData: any = client.readQuery({
                query: GET_CHAT_MESSAGES,
                variables: { id_conversation },
            });

            if (queryData) {
                const newMessages = queryData.getChatMessages.map((msg: any) => 
                    msg.id_message === msgId 
                        ? { ...msg, isDeletedForAll: true, content: "" }
                        : msg
                );
                
                client.writeQuery({
                    query: GET_CHAT_MESSAGES,
                    variables: { id_conversation },
                    data: {
                        getChatMessages: newMessages,
                    },
                });
            }
        } catch (e) {
            console.error("Error al actualizar la cache para poner lápida al mensaje", e);
        }
    };

    const revertHideMessageUI = () => {
        client.refetchQueries({
            include: [GET_CHAT_MESSAGES],
        });
    };

    const handleDeleteForMe = () => {
        setIsActionModalVisible(false);
        if (!selectedMessage) return;

        setConfirmModalData({
            title: "Eliminar mensaje",
            message: "Este mensaje solo se eliminará para ti. Las otras personas en el chat aún podrán verlo.",
            confirmText: "Eliminar",
            onConfirm: async () => {
                const msgId = selectedMessage.id_message;
                handleHideMessageFromUI(msgId);
                setIsConfirmModalVisible(false);
                
                try {
                    await deleteMessageForMeMutation({ variables: { id_message: msgId } });
                } catch (err) {
                    console.error("Error al borrar mensaje para mí", err);
                    revertHideMessageUI();
                    Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el mensaje.' });
                }
            }
        });
        setIsConfirmModalVisible(true);
    };

    const handleDeleteForAll = () => {
        setIsActionModalVisible(false);
        if (!selectedMessage) return;

        setConfirmModalData({
            title: "Eliminar para todos",
            message: "El mensaje se eliminará para todos los participantes del chat.",
            confirmText: "Eliminar",
            onConfirm: async () => {
                const msgId = selectedMessage.id_message;
                handleTombstoneMessageFromUI(msgId); // Mostramos el mensaje gris (Lápida)
                setIsConfirmModalVisible(false);

                try {
                    await deleteMessageForAllMutation({ variables: { id_message: msgId } });
                } catch (err) {
                    console.error("Error al borrar mensaje", err);
                    revertHideMessageUI();
                    Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el mensaje.' });
                }
            }
        });
        setIsConfirmModalVisible(true);
    };

    const handleCopy = async () => {
        setIsActionModalVisible(false);
        if (!selectedMessage) return;

        try {
            await Clipboard.setStringAsync(selectedMessage.content);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
                type: 'success',
                text1: 'Copiado',
                text2: 'Mensaje copiado al portapapeles',
                position: 'bottom',
                visibilityTime: 2000,
            });
        } catch (error) {
            console.error('Error al copiar:', error);
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
            const dateObj = new Date(item.date);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            let dateLabel = '';
            if (dateObj.toDateString() === today.toDateString()) {
                dateLabel = 'Hoy';
            } else if (dateObj.toDateString() === yesterday.toDateString()) {
                dateLabel = 'Ayer';
            } else {
                const isThisYear = dateObj.getFullYear() === today.getFullYear();
                const options: Intl.DateTimeFormatOptions = { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    ...(isThisYear ? {} : { year: 'numeric' })
                };
                let formatted = dateObj.toLocaleDateString('es-ES', options);
                dateLabel = formatted.charAt(0).toUpperCase() + formatted.slice(1);
            }

            return (
                <View style={styles.dateSeparator}>
                    <View style={[styles.datePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            {dateLabel}
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

        if (item.isDeletedForAll) {
            return (
                <View style={[
                    styles.messageRow,
                    isMine ? styles.myMessageRow : styles.theirMessageRow,
                    { marginBottom: isNextSame ? 2 : 12 }
                ]}>
                    <View style={[bubbleStyles, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', borderWidth: 1, borderColor: isDark ? '#3C3C3E' : '#D1D1D6' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="ban-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[
                                styles.messageText,
                                { color: colors.textSecondary, fontStyle: 'italic', fontSize: 13 }
                            ]}>
                                Este mensaje fue eliminado
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={[
                styles.messageRow,
                isMine ? styles.myMessageRow : styles.theirMessageRow,
                { marginBottom: isNextSame ? 2 : 12 }
            ]}>
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedMessage(item);
                        setIsActionModalVisible(true);
                    }}
                    delayLongPress={200}
                    style={bubbleStyles}
                >
                    {item.imageUrl && (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setFullscreenImage(item.imageUrl)}
                        >
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={{
                                    width: screenWidth * 0.55,
                                    height: screenWidth * 0.55 * 0.75,
                                    borderRadius: 12,
                                    marginBottom: item.content ? 6 : 0,
                                }}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    )}
                    {item.videoUrl && (
                        <View style={{ width: screenWidth * 0.55, borderRadius: 12, overflow: 'hidden', marginBottom: item.content ? 6 : 0 }}>
                            <ChatBubbleVideo
                                url={item.videoUrl}
                                width={screenWidth * 0.55}
                                height={screenWidth * 0.55 * 0.75}
                                onPressFullScreen={() => {
                                    setIsMuted(false); // Activamos audio automáticamente para el visor
                                    setFullscreenVideo(item.videoUrl);
                                }}
                            />
                        </View>
                    )}
                    {item.content ? (
                        <HighlightedText text={item.content} sub={searchTerm} mine={isMine} />
                    ) : null}
                    <View style={styles.messageFooter}>
                        {item.editedAt && (
                            <Text style={[
                                styles.messageTime,
                                { color: isMine ? 'rgba(255,255,255,0.6)' : colors.textSecondary, fontStyle: 'italic', marginRight: 4 }
                            ]}>
                                Editado
                            </Text>
                        )}
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
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header Dinámico (Normal o Búsqueda) */}
            {isSearchMode ? (
                <View style={[styles.searchHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => setIsSearchMode(false)} style={styles.backButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    
                    <TextInput 
                        placeholder="Buscar en el chat..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoFocus
                    />

                    {searchResults.length > 0 && (
                        <View style={styles.searchControls}>
                            <Text style={[styles.searchCounter, { color: colors.textSecondary }]}>
                                {currentSearchIndex + 1} de {searchResults.length}
                            </Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    const next = (currentSearchIndex + 1) % searchResults.length;
                                    setCurrentSearchIndex(next);
                                    jumpToMatch(next);
                                }}
                            >
                                <Ionicons name="chevron-up" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => {
                                    const prev = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
                                    setCurrentSearchIndex(prev);
                                    jumpToMatch(prev);
                                }}
                            >
                                <Ionicons name="chevron-down" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
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
                        onPress={() => setIsSearchMode(true)}
                    >
                        <Ionicons name="search" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.headerAction}
                        onPress={() => navigation.navigate('ChatDetails', { id_conversation })}
                    >
                        <Ionicons name="ellipsis-vertical" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

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
                                ref={flatListRef}
                                data={messages}
                                renderItem={renderMessage}
                                keyExtractor={(item) => item.id}
                                inverted={true} // Los mensajes nuevos se mantienen al fondo
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                
                                // Indicador de carga (Aparece arriba en modo inverted={true})
                                ListFooterComponent={() => (
                                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                        {isFetchingMore && hasMore ? (
                                            <ActivityIndicator color={colors.primary} />
                                        ) : (
                                            !hasMore ? renderProfileSummary() : null
                                        )}
                                    </View>
                                )}
                                
                                // Configuración de Infinite Scroll
                                onEndReached={loadOlderMessages}
                                onEndReachedThreshold={0.5} // Carga cuando falte un 50% para ver el tope
                                onScrollToIndexFailed={handleScrollToIndexFailed}
                            />
                    )}
                </View>

                {/* Input de Mensajes */}
                <View style={[styles.inputWrapper, 
                    { 
                        borderTopColor: colors.border, 
                        backgroundColor: colors.background,
                        paddingBottom: 10
                    }
                ]}>
                    {/* Preview de media seleccionada */}
                    {(imagePreview || videoPreview) && (
                        <View style={[styles.imagePreviewBar, { backgroundColor: isDark ? '#1C1C1E' : '#F0F0F0' }]}>
                            {imagePreview && <Image source={{ uri: imagePreview }} style={styles.imagePreviewThumb} />}
                            {videoPreview && (
                                <View style={[styles.imagePreviewThumb, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="videocam" size={20} color="#FFF" />
                                </View>
                            )}
                            <Text style={[styles.imagePreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
                                {videoPreview ? 'Video adjunto' : 'Imagen adjunta'}
                            </Text>
                            <TouchableOpacity onPress={() => { setImagePreview(null); setVideoPreview(null); }} style={styles.imagePreviewClose}>
                                <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Status de subida */}
                    {isUploadingMedia && uploadStatusText ? (
                        <View style={[styles.uploadStatusBar, { backgroundColor: isDark ? '#1C1C1E' : '#F0F0F0' }]}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={[styles.uploadStatusText, { color: colors.textSecondary }]}>{uploadStatusText}</Text>
                        </View>
                    ) : null}

                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F7F7F7' }]}>
                        <TouchableOpacity
                            onPress={handlePickMedia}
                            style={styles.attachButton}
                            disabled={isUploadingMedia}
                        >
                            {isUploadingMedia ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="attach-outline" size={24} color={colors.primary} style={{ transform: [{ rotate: '45deg' }] }} />
                            )}
                        </TouchableOpacity>

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
                            disabled={(!messageText.trim() && !imagePreview && !videoPreview) || isUploadingMedia}
                            style={[
                                styles.sendButton, 
                                { backgroundColor: (messageText.trim().length > 0 || imagePreview || videoPreview) && !isUploadingMedia ? colors.primary : (isDark ? '#2C2C2E' : '#E5E5EA') }
                            ]}
                        >
                            {isUploadingMedia ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons 
                                    name="arrow-up" 
                                    size={20} 
                                    color={(messageText.trim().length > 0 || imagePreview || videoPreview) ? "#FFF" : colors.textSecondary} 
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <Modal
                visible={!!fullscreenImage || !!fullscreenVideo}
                transparent
                animationType="fade"
                onRequestClose={() => { setFullscreenImage(null); setFullscreenVideo(null); }}
            >
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    <TouchableOpacity
                        style={[styles.fullscreenCloseBtn, { zIndex: 999 }]}
                        onPress={() => { setFullscreenImage(null); setFullscreenVideo(null); }}
                    >
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    
                    {fullscreenImage && (
                        <ZoomableImageViewer
                            url={fullscreenImage}
                            mediaType="image"
                            onClose={() => setFullscreenImage(null)}
                        />
                    )}
                    {fullscreenVideo && (
                        <ActualFullscreenVideo
                            url={fullscreenVideo}
                            isMuted={isMuted}
                            toggleMute={() => setIsMuted(!isMuted)}
                            colors={colors}
                            insets={insets}
                            isVisible={!!fullscreenVideo}
                            onClose={() => setFullscreenVideo(null)}
                        />
                    )}
                </View>
            </Modal>

            {/* Modal de Acciones del Mensaje */}
            <Modal
                visible={isActionModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsActionModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setIsActionModalVisible(false)}
                >
                    <View style={[styles.actionModalContainer, { backgroundColor: colors.surface }]}>
                        {selectedMessage?.sender?.id === currentUser?.id ? (
                            <>
                                <TouchableOpacity 
                                    style={styles.actionModalBtn}
                                    onPress={handleDeleteForAll}
                                >
                                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                                    <Text style={[styles.actionModalText, { color: '#FF3B30' }]}>Eliminar para todos</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.actionModalBtn}
                                    onPress={handleDeleteForMe}
                                >
                                    <Ionicons name="trash-bin-outline" size={24} color={colors.text} />
                                    <Text style={[styles.actionModalText, { color: colors.text }]}>Eliminar para mí</Text>
                                </TouchableOpacity>

                                <View style={[styles.actionModalDivider, { backgroundColor: colors.border }]} />

                                <TouchableOpacity 
                                    style={styles.actionModalBtn}
                                    onPress={() => {
                                        setIsActionModalVisible(false);
                                        setEditingMessage(selectedMessage);
                                        setMessageText(selectedMessage.content);
                                    }}
                                >
                                    <Ionicons name="pencil-outline" size={24} color={colors.text} />
                                    <Text style={[styles.actionModalText, { color: colors.text }]}>Editar</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity 
                                style={styles.actionModalBtn}
                                onPress={handleDeleteForMe}
                            >
                                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                                <Text style={[styles.actionModalText, { color: '#FF3B30' }]}>Eliminar</Text>
                            </TouchableOpacity>
                        )}

                        <View style={[styles.actionModalDivider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity 
                            style={styles.actionModalBtn}
                            onPress={handleCopy}
                        >
                            <Ionicons name="copy-outline" size={24} color={colors.text} />
                            <Text style={[styles.actionModalText, { color: colors.text }]}>Copiar texto</Text>
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
                        <Text style={[styles.confirmModalTitle, { color: colors.text }]}>{confirmModalData.title}</Text>
                        <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                            {confirmModalData.message}
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
                                onPress={confirmModalData.onConfirm}
                            >
                                <Text style={[styles.confirmModalBtnText, { color: '#FF3B30', fontWeight: 'bold' }]}>
                                    {confirmModalData.confirmText}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        padding: 5,
        marginLeft: 8,
    },
    searchHeader: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 10,
    },
    searchControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchCounter: {
        fontSize: 12,
        fontWeight: '600',
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
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionModalContainer: {
        width: '80%',
        borderRadius: 15,
        paddingVertical: 10,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    actionModalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    actionModalText: {
        fontSize: 16,
        marginLeft: 15,
        fontWeight: '500',
    },
    actionModalDivider: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
        marginVertical: 5,
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
    imagePreviewBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        marginBottom: -4,
    },
    imagePreviewThumb: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 10,
    },
    imagePreviewText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
    imagePreviewClose: {
        padding: 4,
    },
    fullscreenImageContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 8,
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
    },
    uploadStatusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        gap: 8,
    },
    uploadStatusText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
