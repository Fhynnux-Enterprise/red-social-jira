import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../../navigation/AppNavigator';
import { useQuery, useMutation, useSubscription, useApolloClient } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_CHAT_MESSAGES, SEND_MESSAGE, GET_CONVERSATION, DELETE_MESSAGE_FOR_ME, DELETE_MESSAGE_FOR_ALL, EDIT_MESSAGE, SEARCH_MESSAGES_IN_CHAT, MESSAGE_ADDED_SUBSCRIPTION, MARK_MESSAGES_AS_READ, MESSAGES_READ_SUBSCRIPTION, GET_CHAT_MEDIA } from '../graphql/chat.operations';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { Video as VideoCompressor } from 'react-native-compressor';
import { OnlineStatusIndicator } from '../components/OnlineStatusIndicator';
import { ChatBubbleVideo } from '../components/ChatBubbleVideo';
import { AudioPlayerBubble } from '../components/AudioPlayerBubble';
import ZoomableImageViewer from '../../feed/components/ZoomableImageViewer';
import { InteractiveVideoPlayer } from '../../feed/components/ImageCarousel';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, getRecordingPermissionsAsync, useAudioRecorderState, useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useAudioUpload } from '../../storage/hooks/useAudioUpload';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Componente para manejar la miniatura de respuesta a historia (especialmente para videos)
const StoryReplyThumbnail = ({ uri, isVideo, style }: { uri: string; isVideo: boolean; style: any }) => {
    const player = useVideoPlayer(isVideo ? uri : null, (p) => {
        if (p) {
            p.muted = true;
            p.pause();
        }
    });

    // En Android, evitamos pasar el player a VideoView si no hay video o el objeto se está liberando
    // Usamos una doble comprobación para evitar el error de "shared object released"
    if (!isVideo || !player || !uri) {
        return <Image source={{ uri: uri || undefined }} style={style} />;
    }

    return (
        <View style={[style, { overflow: 'hidden', backgroundColor: '#000' }]}>
            <VideoView 
                player={player} 
                style={StyleSheet.absoluteFill} 
                contentFit="cover" 
                nativeControls={false}
            />
        </View>
    );
};

export default function ChatRoomScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<any>();
    const localParams = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const params = route.params || localParams || {};
    const { conversationId } = params;
    const { user: currentUser } = useAuth() as any;
    const router = useRouter();
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
    const [isMuted, setIsMuted] = useState(true);
    
    // Grabación de Audio
    const { uploadAudio, isUploading: isUploadingAudio } = useAudioUpload();
    const recorder = useAudioRecorder({ 
        ...RecordingPresets.HIGH_QUALITY, 
        isMeteringEnabled: true 
    });
    const recorderState = useAudioRecorderState(recorder, 500); // Forzar actualización cada 500ms
    const [isRecording, setIsRecording] = useState(false);
    const [meteringHistory, setMeteringHistory] = useState<number[]>([]);
    
    // Reproductor de previsualización (para cuando se pausa la grabación)
    const previewPlayer = useAudioPlayer(recorder.uri);

    // Efecto para capturar los niveles de audio (waveform)
    useEffect(() => {
        if (isRecording && recorderState.isRecording && recorderState.metering !== undefined) {
            // Normalizar el nivel (-160 a 0)
            const level = Math.max(0.1, (recorderState.metering + 160) / 160);
            setMeteringHistory(prev => [...prev.slice(-30), level]);
        }
    }, [recorderState.metering, isRecording, recorderState.isRecording]);

    // Asegurar que el preview player tiene el audio cargado cuando se pausa
    useEffect(() => {
        if (recorderState.isPaused && recorder.uri) {
            previewPlayer.replace(recorder.uri);
        }
    }, [recorderState.isPaused, recorder.uri]);
    
    // Visor de Galería Unificado
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerActiveIndex, setViewerActiveIndex] = useState(0);

    const screenWidth = Dimensions.get('window').width;

    const MESSAGES_LIMIT = 20;
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    
    // Estado local de mensajes — fuente única de verdad para la UI
    const [localMessages, setLocalMessages] = useState<any[]>([]);

    const { loading, data: queryData, fetchMore } = useQuery(GET_CHAT_MESSAGES, {
        variables: { conversationId, limit: MESSAGES_LIMIT, offset: 0 },
        skip: !conversationId,
        fetchPolicy: 'cache-and-network', 
        nextFetchPolicy: 'cache-first',   
        notifyOnNetworkStatusChange: false,
    });

    const { data: mediaData } = useQuery<any>(GET_CHAT_MEDIA, {
        variables: { conversationId },
        skip: !conversationId,
    });

    // Fuente única para la galería: si ya cargó mediaData, la usamos.
    // Si no, usamos lo que haya cargado en el chat localmente.
    const chatMediaList = useMemo(() => {
        // Obtenemos multimedia de los mensajes locales cargados actualmente
        const localMedia = localMessages
            .filter((m: any) => (m.imageUrl || m.videoUrl) && !m.isDeletedForAll);
            
        // Si hay datos del backend (historial completo), los usamos como base
        const backendMedia = mediaData?.getChatMedia || [];
        
        // Combinamos ambos evitando duplicados por ID o URL
        const combined = [...localMedia];
        backendMedia.forEach((bm: any) => {
            const exists = combined.some(lm => lm.id === bm.id || (lm.imageUrl && lm.imageUrl === bm.imageUrl) || (lm.videoUrl && lm.videoUrl === bm.videoUrl));
            if (!exists) {
                combined.push(bm);
            }
        });

        // Ordenamos cronológicamente (más antiguos primero para el swipe natural)
        return combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [mediaData, localMessages]);
    useEffect(() => {
        const serverMsgs: any[] = (queryData as any)?.getChatMessages || [];
        if (serverMsgs.length === 0) return;

        setLocalMessages(prev => {
            const isFirstLoad = prev.length === 0;

            if (isFirstLoad) {
                // Primera carga: simplemente usar los mensajes del servidor
                if (serverMsgs.length < MESSAGES_LIMIT) setHasMore(false);
                return serverMsgs;
            }

            // Re-carga (al volver al chat): MERGE inteligente
            // Construimos un Map preservando todos los mensajes locales Y los nuevos del servidor
            const msgMap = new Map<string, any>();
            // Primero los mensajes locales (incluyen los enviados y recibidos por WS)
            prev.forEach((m: any) => msgMap.set(m.id, m));
            // Luego los del servidor (sobrescriben si hay actualizaciones de contenido, ej: mensajes editados)
            serverMsgs.forEach((m: any) => msgMap.set(m.id, m));

            // Ordenamos DESC por fecha (el más nuevo primero, como necesita el FlatList invertido)
            const merged = Array.from(msgMap.values()).sort(
                (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            return merged;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryData]);


    const [markMessagesAsReadMutation] = useMutation(MARK_MESSAGES_AS_READ);

    const markAsRead = useCallback(async () => {
        if (!conversationId) return;
        try {
            await markMessagesAsReadMutation({ variables: { conversationId } });
        } catch (e) {
            console.log('[Chat] Error marking as read:', e);
        }
    }, [conversationId, markMessagesAsReadMutation]);

    // Marcar como leído al entrar o enfocar el chat
    useFocusEffect(
        useCallback(() => {
            markAsRead();
        }, [markAsRead])
    );

    // Subscription WebSocket — mensajes nuevos
    useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
        variables: { conversationId },
        skip: !conversationId,
        onData: ({ data: subResult }: any) => {
            const newMsg = subResult?.data?.messageAdded;
            if (!newMsg) return;
            
            setLocalMessages(prev => {
                if (prev.some((m: any) => m.id === newMsg.id)) return prev;
                return [newMsg, ...prev];
            });

            // Si el mensaje es de la otra persona y estamos viendo el chat, marcar como leído
            if (newMsg.sender.id !== currentUser?.id) {
                markAsRead();
            }
        },
        onError: (e: any) => {
            console.log('[WS Chat] Subscription error silenciado:', e.message);
        },
    });

    // Subscription WebSocket — confirmación de lectura (Visto azul)
    useSubscription(MESSAGES_READ_SUBSCRIPTION, {
        variables: { conversationId },
        skip: !conversationId,
        onData: ({ data: subResult }: any) => {
            const payload = subResult?.data?.messagesRead;
            if (!payload) return;

            // Si ALGUIEN MÁS leyó mis mensajes, actualizamos isRead a true para todos mis mensajes
            if (payload.readerId !== currentUser?.id) {
                setLocalMessages((prev: any[]) => 
                    prev.map((m: any) => m.sender?.id === currentUser?.id ? { ...m, isRead: true } : m)
                );
            }
        }
    });

    // Cargar mensajes más antiguos (infinite scroll)
    const loadOlderMessages = async () => {
        if (isFetchingMore || !hasMore) return;
        setIsFetchingMore(true);
        try {
            const { data: moreData } = await fetchMore({
                variables: {
                    conversationId,
                    limit: MESSAGES_LIMIT,
                    offset: localMessages.length,
                },
            }) as any;

            const newMsgs: any[] = moreData?.getChatMessages || [];
            if (newMsgs.length < MESSAGES_LIMIT) {
                setHasMore(false);
            }
            if (newMsgs.length > 0) {
                setLocalMessages(prev => {
                    const existingIds = new Set(prev.map((m: any) => m.id));
                    const unique = newMsgs.filter((m: any) => !existingIds.has(m.id));
                    return [...prev, ...unique];
                });
            }
        } catch (e) {
            console.error('Error cargando historial:', e);
            setHasMore(false);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Reset al cambiar de conversación
    useEffect(() => {
        setLocalMessages([]);
        setHasMore(true);
    }, [conversationId]);

    // Query para obtener info de la conversación (para el header)
    const { data: convData } = useQuery(GET_CONVERSATION, {
        variables: { conversationId },
        skip: !conversationId,
    });

    // Memos para info de la conversación
    const isBlocked = useMemo(() => (convData as any)?.getConversation?.isBlocked, [convData]);

    const otherUser = useMemo(() => {
        const participants = (convData as any)?.getConversation?.participants;
        if (!participants || participants.length === 0) return null;
        const other = participants.find((p: any) => p.user.id !== currentUser?.id);
        return other ? other.user : (participants[0]?.user || null);
    }, [convData, currentUser?.id]);

    const [deleteMessageForMeMutation] = useMutation(DELETE_MESSAGE_FOR_ME);
    const [deleteMessageForAllMutation] = useMutation(DELETE_MESSAGE_FOR_ALL);
    const [editMessageMutation] = useMutation(EDIT_MESSAGE, {
        // Actualiza el mensaje en el estado local inmediatamente al guardar la edición
        onCompleted: ({ editMessage }: any) => {
            if (!editMessage) return;
            // 1. Actualizar el estado local para que la UI refleje el cambio al instante
            setLocalMessages(prev =>
                prev.map((m: any) =>
                    m.id === editMessage.id
                        ? { ...m, content: editMessage.content, editedAt: editMessage.editedAt }
                        : m
                )
            );
            // 2. Actualizar la caché Apollo para que persista si el usuario navega fuera y vuelve
            try {
                const existing: any = client.readQuery({
                    query: GET_CHAT_MESSAGES,
                    variables: { conversationId, limit: MESSAGES_LIMIT, offset: 0 },
                });
                if (existing?.getChatMessages) {
                    client.writeQuery({
                        query: GET_CHAT_MESSAGES,
                        variables: { conversationId, limit: MESSAGES_LIMIT, offset: 0 },
                        data: {
                            getChatMessages: existing.getChatMessages.map((m: any) =>
                                m.id === editMessage.id
                                    ? { ...m, content: editMessage.content, editedAt: editMessage.editedAt }
                                    : m
                            ),
                        },
                    });
                }
            } catch {
                // Cache vacía, no hay problema
            }
        },
    });

    // Mutación para enviar mensaje
    // update(): escribe el mensaje enviado en la caché de Apollo con las variables exactas de la query.
    // Esto es CRUCIAL: si el usuario sale del chat y vuelve, Apollo lee la caché primero
    // (gracias a cache-and-network), y verá el mensaje enviado INMEDIATAMENTE.
    const [sendMessageMutation] = useMutation(SEND_MESSAGE, {
        update(cache, result: any) {
            const sentMsg = result?.data?.sendMessage;
            if (!sentMsg) return;
            try {
                const existing: any = cache.readQuery({
                    query: GET_CHAT_MESSAGES,
                    variables: { conversationId, limit: MESSAGES_LIMIT, offset: 0 },
                });
                if (existing?.getChatMessages) {
                    const msgs: any[] = existing.getChatMessages;
                    if (!msgs.some((m: any) => m.id === sentMsg.id)) {
                        cache.writeQuery({
                            query: GET_CHAT_MESSAGES,
                            variables: { conversationId, limit: MESSAGES_LIMIT, offset: 0 },
                            data: { getChatMessages: [sentMsg, ...msgs] },
                        });
                    }
                }
            } catch {
                // La caché puede estar vacía la primera vez, está bien ignorar el error
            }
        },
        onCompleted: ({ sendMessage }: any) => {
            if (!sendMessage) return;
            setLocalMessages(prev => {
                if (prev.some((m: any) => m.id === sendMessage.id)) return prev;
                return [sendMessage, ...prev];
            });
        },
    });

    const messages = useMemo(() => {
        const grouped: any[] = [];
        // Usamos un Set para evitar claves duplicadas de separadores de fecha.
        // Esto ocurre cuando hay mensajes del mismo día en posiciones no contiguas
        // (e.g., primera página y página de historial cargada después).
        const usedDateKeys = new Set<string>();

        localMessages.forEach((msg: any, index: number) => {
            grouped.push({ ...msg, type: 'MESSAGE', id: msg.id });
            const currentDate = new Date(msg.createdAt).toDateString();
            const nextMsg = localMessages[index + 1];
            const nextDate = nextMsg ? new Date(nextMsg.createdAt).toDateString() : null;
            if (currentDate !== nextDate) {
                // Garantizamos unicidad de la key aunque haya repetición de fecha
                let sepKey = `date-${currentDate}`;
                if (usedDateKeys.has(sepKey)) {
                    sepKey = `${sepKey}-${index}`;
                }
                usedDateKeys.add(`date-${currentDate}`);
                grouped.push({ type: 'DATE_SEPARATOR', date: msg.createdAt, id: sepKey });
            }
        });
        return grouped;
    }, [localMessages]);

    const handleSend = async () => {
        const hasText = messageText.trim().length > 0;
        const hasMedia = !!imagePreview || !!videoPreview;
        if ((!hasText && !hasMedia) || !conversationId) return;

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
                    variables: { messageId: editingMessage.id, newContent: content },
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
                    conversationId,
                    content: content || '',
                    imageUrl: uploadedImageUrl || undefined,
                    videoUrl: uploadedVideoUrl || undefined,
                },
            });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    const resolveMediaUrl = (url?: string | null, fallbackType: 'avatar' | 'none' = 'none', username: string = 'U') => {
        if (!url) {
            if (fallbackType === 'avatar') return `https://i.pravatar.cc/150?u=${username}`;
            return '';
        }
        if (url.startsWith('http') || url.startsWith('file://')) return url;
        const serverUrl = 'https://canton-enterprise-production.up.railway.app';
        return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleDownloadAudio = async () => {
        if (!selectedMessage?.audioUrl) return;
        setIsActionModalVisible(false);
        
        try {
            // Pedir permisos si no los tenemos
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({ type: 'error', text1: 'Permiso denegado', text2: 'Necesitamos acceso a la galería para guardar el audio.' });
                return;
            }

            const fileUri = FileSystem.documentDirectory + `audio_${selectedMessage.id}.m4a`;
            const download = await FileSystem.downloadAsync(selectedMessage.audioUrl, fileUri);
            
            if (download.status === 200) {
                await MediaLibrary.createAssetAsync(download.uri);
                Toast.show({ type: 'success', text1: 'Audio descargado', text2: 'Se guardó en tu galería/archivos.' });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo descargar el audio.' });
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const permission = await getRecordingPermissionsAsync();
            
            if (permission.status !== 'granted') {
                const request = await requestRecordingPermissionsAsync();
                if (request.status !== 'granted') {
                    Toast.show({ 
                        type: 'error', 
                        text1: 'Permisos de Micrófono', 
                        text2: 'Necesitamos acceso al micrófono para grabar audios.' 
                    });
                    return;
                }
            }

            // Aseguramos el modo de audio para grabación
            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            setMeteringHistory([]);
            setIsRecording(true);
            
            await recorder.prepareToRecordAsync();
            await recorder.record();
        } catch (err) {
            setIsRecording(false);
        }
    };

    const togglePauseRecording = async () => {
        if (recorder.isRecording) {
            await recorder.pause();
        } else {
            await recorder.record();
        }
    };

    const cancelRecording = async () => {
        try {
            await recorder.stop();
        } catch (err) { }
        setIsRecording(false);
        setMeteringHistory([]);
    };

    const stopRecording = async () => {
        try {
            // Usamos recorderState.durationMillis que es más fiable y está en ms
            const durationMs = recorderState.durationMillis;
            const durationSeconds = Math.floor(durationMs / 1000);
            const uri = recorder.uri;
            
            await recorder.stop();
            setIsRecording(false);

            // Permitir audios de al menos 1 segundo
            if (!uri || durationSeconds < 1) {
                if (uri) await recorder.stop(); // Asegurar parada
                return;
            }

            const publicAudioUrl = await uploadAudio(uri);

            await sendMessageMutation({
                variables: {
                    conversationId,
                    content: '',
                    audioUrl: publicAudioUrl,
                    audioDuration: durationSeconds
                }
            });
        } catch (err) {
            console.error('Failed to upload recording', err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el audio.' });
            setIsRecording(false);
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
        variables: { conversationId, searchTerm: '' },
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
                const { data: searchData } = await searchMessagesQuery({ conversationId, searchTerm });
                const ids = (searchData as any)?.searchMessagesInChat?.map((m: any) => m.id) || [];
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
        setLocalMessages(prev => prev.filter((m: any) => m.id !== msgId));
    };

    const handleTombstoneMessageFromUI = (msgId: string) => {
        setLocalMessages(prev => prev.map((m: any) =>
            m.id === msgId ? { ...m, isDeletedForAll: true, content: '' } : m
        ));
    };

    const revertHideMessageUI = () => {
        // Con estado local, para 'revertir' simplemente hacemos un refetch completo
        setLocalMessages([]);
        setHasMore(true);
        // El useQuery con network-only va a correr de nuevo en el próximo render gracias al cambio de estado
    };

    const handleDeleteForMe = () => {
        setIsActionModalVisible(false);
        if (!selectedMessage) return;

        setConfirmModalData({
            title: "Eliminar mensaje",
            message: "Este mensaje solo se eliminará para ti. Las otras personas en el chat aún podrán verlo.",
            confirmText: "Eliminar",
            onConfirm: async () => {
                const msgId = selectedMessage.id;
                handleHideMessageFromUI(msgId);
                setIsConfirmModalVisible(false);
                
                try {
                    await deleteMessageForMeMutation({ variables: { messageId: msgId } });
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
                const msgId = selectedMessage.id;
                handleTombstoneMessageFromUI(msgId); // Mostramos el mensaje gris (Lápida)
                setIsConfirmModalVisible(false);

                try {
                    await deleteMessageForAllMutation({ variables: { messageId: msgId } });
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
                    <Image 
                        source={{ uri: resolveMediaUrl(otherUser?.photoUrl || otherUser?.avatarUrl, 'avatar', otherUser?.username) }} 
                        style={styles.summaryAvatar} 
                    />
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
                // Bordes siempre redondeados (20px) según petición del usuario
                borderRadius: 20,
            }
        ];

        if (item.isDeletedForAll) {
            return (
                <View style={[
                    styles.messageRow,
                    isMine ? styles.myMessageRow : styles.theirMessageRow,
                    { marginBottom: isNextSame ? 2 : 12 }
                ]}>
                    {!isMine && (
                        <View style={styles.bubbleAvatarContainer}>
                            <Image 
                                source={{ uri: resolveMediaUrl(item.sender?.photoUrl || item.sender?.avatarUrl, 'avatar', item.sender?.username) }} 
                                style={styles.bubbleAvatar} 
                            />
                        </View>
                    )}
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
                    {isMine && (
                        <View style={styles.bubbleAvatarContainerRight}>
                            <Image 
                                source={{ uri: resolveMediaUrl(currentUser?.photoUrl || currentUser?.avatarUrl, 'avatar', currentUser?.username) }} 
                                style={styles.bubbleAvatar} 
                            />
                        </View>
                    )}
                </View>
            );
        }

        return (
            <View style={[
                styles.messageRow,
                isMine ? styles.myMessageRow : styles.theirMessageRow,
                { marginBottom: isNextSame ? 4 : 16 }
            ]}>
                {/* Avatar izquierdo (para otros) */}
                {!isMine && (
                    <View style={styles.bubbleAvatarContainer}>
                        <Image 
                            source={{ uri: resolveMediaUrl(item.sender?.photoUrl || item.sender?.avatarUrl, 'avatar', item.sender?.username) }} 
                            style={styles.bubbleAvatar} 
                        />
                    </View>
                )}

                <View style={[styles.bubbleWrapper, { alignItems: isMine ? 'flex-end' : 'flex-start' }]}>
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
                    {item.storyId && (
                        <TouchableOpacity 
                            style={[
                                styles.storyReplyContainer, 
                                { 
                                    backgroundColor: isMine ? 'rgba(0,0,0,0.15)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                                    borderColor: isMine ? 'rgba(255,255,255,0.2)' : colors.border,
                                    borderWidth: isMine ? 0 : 0.5
                                }
                            ]}
                            onPress={() => {
                                navigation.navigate('StoryViewer', { 
                                    userId: item.sender?.id, 
                                    initialStoryId: item.storyId 
                                });
                            }}
                        >
                            <View style={[styles.storyReplyIndicator, { backgroundColor: isMine ? '#FFF' : colors.primary }]} />
                            <View style={{ flex: 1, paddingVertical: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                    <Ionicons name="flash-outline" size={12} color={isMine ? 'rgba(255,255,255,0.9)' : colors.primary} style={{ marginRight: 4 }} />
                                    <Text style={[styles.storyReplyLabel, { color: isMine ? 'rgba(255,255,255,0.9)' : colors.primary, marginBottom: 0 }]}>Historia</Text>
                                </View>
                                <Text style={[styles.storyReplyText, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]} numberOfLines={1}>
                                    Ver historia original
                                </Text>
                            </View>
                            {(item.imageUrl || item.videoUrl) ? (
                                <StoryReplyThumbnail 
                                    uri={resolveMediaUrl((item.imageUrl || item.videoUrl) as string)} 
                                    isVideo={!!item.videoUrl} 
                                    style={styles.storyReplyThumb} 
                                />
                            ) : (
                                <View style={[styles.storyReplyThumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#333' : '#EEE' }]}>
                                    <Ionicons name="alert-circle-outline" size={20} color={colors.textSecondary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                    {item.imageUrl && !item.storyId && (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                const mIdx = chatMediaList.findIndex(m => 
                                    m.id === item.id || 
                                    (item.imageUrl && m.imageUrl === item.imageUrl)
                                );
                                if (mIdx !== -1) {
                                    setViewerActiveIndex(mIdx);
                                    setViewerVisible(true);
                                }
                            }}
                        >
                            <Image
                                source={{ uri: resolveMediaUrl(item.imageUrl) }}
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
                    {item.videoUrl && !item.storyId && (
                        <View style={{ width: screenWidth * 0.55, borderRadius: 12, overflow: 'hidden', marginBottom: item.content ? 6 : 0 }}>
                            <ChatBubbleVideo
                                url={resolveMediaUrl(item.videoUrl)}
                                width={screenWidth * 0.55}
                                height={screenWidth * 0.55 * 0.75}
                                onPressFullScreen={() => {
                                    setIsMuted(false);
                                    const mIdx = chatMediaList.findIndex(m => 
                                        m.id === item.id || 
                                        (item.videoUrl && m.videoUrl === item.videoUrl)
                                    );
                                    if (mIdx !== -1) {
                                        setViewerActiveIndex(mIdx);
                                        setViewerVisible(true);
                                    }
                                }}
                            />
                        </View>
                    )}
                    {item.audioUrl && (
                        <AudioPlayerBubble 
                            audioUrl={resolveMediaUrl(item.audioUrl)} 
                            audioDuration={item.audioDuration} 
                            isMine={isMine}
                            messageTime={new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            isRead={item.isRead}
                            isEdited={!!item.editedAt}
                        />
                    )}
                    {item.content ? (
                        <>
                            <HighlightedText text={item.content} sub={searchTerm} mine={isMine} />
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
                                    { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                                ]}>
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </Text>
                                {isMine && (
                                    <Ionicons 
                                        name="checkmark-done" 
                                        size={16} 
                                        color={item.isRead ? "#00E5FF" : "rgba(255,255,255,0.4)"} 
                                        style={{ marginLeft: 4, marginBottom: -1 }}
                                    />
                                )}
                            </View>
                        </>
                    ) : (
                        !item.audioUrl && (
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
                                    { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                                ]}>
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </Text>
                                {isMine && (
                                    <Ionicons 
                                        name="checkmark-done" 
                                        size={16} 
                                        color={item.isRead ? "#00E5FF" : "rgba(255,255,255,0.4)"} 
                                        style={{ marginLeft: 4, marginBottom: -1 }}
                                    />
                                )}
                            </View>
                        )
                    )}
                    </TouchableOpacity>
                </View>

                {/* Avatar derecho (para mí) */}
                {isMine && (
                    <View style={styles.bubbleAvatarContainerRight}>
                        <Image 
                            source={{ uri: resolveMediaUrl(currentUser?.photoUrl || currentUser?.avatarUrl, 'avatar', currentUser?.username) }} 
                            style={styles.bubbleAvatar} 
                        />
                    </View>
                )}
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
                        onPress={() => router.push({
                            pathname: '/chatDetails',
                            params: { conversationId }
                        })}
                        activeOpacity={0.7}
                    >
                        <Image 
                            source={{ uri: resolveMediaUrl(otherUser?.photoUrl || otherUser?.avatarUrl, 'avatar', otherUser?.username) }} 
                            style={styles.headerAvatar} 
                        />
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                                {otherUser ? `${otherUser.firstName} ${otherUser.lastName} ${otherUser.id === currentUser?.id ? '(Tú)' : ''}` : 'Cargando...'}
                            </Text>
                            {!isBlocked && (
                                <View style={styles.onlineStatus}>
                                    <OnlineStatusIndicator 
                                        lastActiveAt={otherUser?.lastActiveAt} 
                                        showText={true} 
                                    />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.headerAction}
                        onPress={() => setIsSearchMode(true)}
                    >
                        <Ionicons name="search" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Contenido con Desplazamiento de Teclado Manual */}
            <Animated.View style={{ flex: 1, paddingBottom: keyboardOffset }}>
                {/* Lista de Mensajes */}
                <View style={styles.chatContainer}>
                    {loading && localMessages.length === 0 ? (
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
                                // Optimización de rendimiento para Android y Videos
                                initialNumToRender={10}
                                maxToRenderPerBatch={5}
                                windowSize={5}
                                removeClippedSubviews={Platform.OS === 'android'}
                                
                                // Indicador de carga (el Footer aparece VISUALMENTE ARRIBA cuando inverted=true)
                                ListFooterComponent={() => {
                                    if (isFetchingMore) {
                                        return (
                                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                                <ActivityIndicator color={colors.primary} />
                                            </View>
                                        );
                                    }
                                    if (!hasMore) {
                                        return (
                                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                                {renderProfileSummary()}
                                            </View>
                                        );
                                    }
                                    // hasMore=true y no estamos cargando: no mostrar nada
                                    return null;
                                }}
                                
                                // Configuración de Infinite Scroll
                                onEndReached={loadOlderMessages}
                                onEndReachedThreshold={0.5} // Carga cuando falte un 50% para ver el tope
                                onScrollToIndexFailed={handleScrollToIndexFailed}
                            />
                    )}
                </View>

                {/* Input de Mensajes o Mensaje de Bloqueo */}
                <View style={[styles.inputWrapper, 
                    { 
                        borderTopColor: colors.border, 
                        backgroundColor: colors.background,
                        paddingBottom: 10
                    }
                ]}>
                    {isBlocked ? (
                        <View style={[styles.blockedInfoContainer, { backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.05)' }]}>
                            <Ionicons name="lock-closed" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.blockedInfoText, { color: colors.textSecondary }]}>
                                No puedes responder a esta conversación.
                            </Text>
                        </View>
                    ) : (
                        <>
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

                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F7F7F7', paddingVertical: 10 }]}>
                                {isRecording ? (
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                                        {/* Botón de borrar */}
                                        <TouchableOpacity onPress={cancelRecording} style={{ padding: 8 }}>
                                            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                                        </TouchableOpacity>
                                        
                                        {/* Área central: Waveform o Reproductor de Preview */}
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 }}>
                                            {(!recorder.isRecording || recorderState.isPaused) && recorderState.durationMillis > 0 ? (
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        if (previewPlayer.playing) {
                                                            previewPlayer.pause();
                                                        } else {
                                                            if (recorder.uri) {
                                                                // Asegurar que el player tiene el URI correcto antes de sonar
                                                                previewPlayer.replace(recorder.uri);
                                                                previewPlayer.play();
                                                            } else {
                                                                console.log("No recorder URI available yet");
                                                            }
                                                        }
                                                    }}
                                                    style={{ marginRight: 10 }}
                                                >
                                                    <Ionicons name={previewPlayer.playing ? "pause" : "play"} size={22} color={colors.primary} />
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', marginRight: 8 }} />
                                            )}

                                            <View style={{ flex: 1, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                                {meteringHistory.length > 0 ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        {meteringHistory.map((level, i) => (
                                                            <View 
                                                                key={i} 
                                                                style={{ 
                                                                    width: 2, 
                                                                    height: Math.max(4, 30 * level), 
                                                                    backgroundColor: colors.primary, 
                                                                    marginHorizontal: 1,
                                                                    borderRadius: 1,
                                                                    opacity: recorderState.isPaused ? 0.6 : 1
                                                                }} 
                                                            />
                                                        ))}
                                                    </View>
                                                ) : (
                                                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                                                        Iniciando...
                                                    </Text>
                                                )}
                                            </View>
                                            
                                            <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600', marginLeft: 10, minWidth: 40 }}>
                                                {formatDuration(Math.floor(recorderState.durationMillis / 1000))}
                                            </Text>
                                        </View>

                                        {/* Botón de Pausa/Play para grabar */}
                                        <TouchableOpacity onPress={togglePauseRecording} style={{ padding: 8, marginRight: 5 }}>
                                            <Ionicons 
                                                name={recorder.isRecording ? "pause-circle" : "play-circle"} 
                                                size={28} 
                                                color={colors.primary} 
                                            />
                                        </TouchableOpacity>

                                        {/* Botón de enviar */}
                                        <TouchableOpacity 
                                            onPress={stopRecording} 
                                            disabled={isUploadingAudio}
                                            style={[styles.sendButton, { backgroundColor: colors.primary }]}
                                        >
                                            {isUploadingAudio ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Ionicons name="arrow-up" size={20} color="#FFF" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            onPress={handlePickMedia}
                                            style={styles.attachButton}
                                            disabled={isUploadingMedia || isUploadingAudio}
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

                                        {!messageText.trim() && !imagePreview && !videoPreview ? (
                                            <TouchableOpacity 
                                                onPress={startRecording}
                                                style={[styles.sendButton, { backgroundColor: colors.primary }]}
                                            >
                                                <Ionicons name="mic" size={20} color="#FFF" />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity 
                                                onPress={handleSend}
                                                disabled={isUploadingMedia || isUploadingAudio}
                                                style={[
                                                    styles.sendButton, 
                                                    { backgroundColor: colors.primary }
                                                ]}
                                            >
                                                {isUploadingMedia || isUploadingAudio ? (
                                                    <ActivityIndicator size="small" color="#FFF" />
                                                ) : (
                                                    <Ionicons name="arrow-up" size={20} color="#FFF" />
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </View>
                        </>
                    )}
                </View>
            </Animated.View>

            <Modal
                visible={viewerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setViewerVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    <TouchableOpacity
                        style={[styles.fullscreenCloseBtn, { zIndex: 999, top: insets.top + 20 }]}
                        onPress={() => setViewerVisible(false)}
                    >
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>

                    <FlatList
                        data={chatMediaList}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={viewerActiveIndex}
                        getItemLayout={(_, index) => ({
                            length: screenWidth,
                            offset: screenWidth * index,
                            index,
                        })}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        onMomentumScrollEnd={(event) => {
                            const xOffset = event.nativeEvent.contentOffset.x;
                            const index = Math.round(xOffset / screenWidth);
                            setViewerActiveIndex(index);
                        }}
                        renderItem={({ item, index }) => (
                            <View style={{ width: screenWidth, height: Dimensions.get('window').height, justifyContent: 'center' }}>
                                {item.videoUrl ? (
                                    <InteractiveVideoPlayer
                                        url={resolveMediaUrl(item.videoUrl)}
                                        width={screenWidth}
                                        height={Dimensions.get('window').height}
                                        isMuted={isMuted}
                                        shouldPlay={viewerActiveIndex === index && viewerVisible}
                                        toggleMute={() => setIsMuted(!isMuted)}
                                        isInteractive={true}
                                        hideExpand={true}
                                        contentFit="contain"
                                        insets={insets}
                                    />
                                ) : (
                                    <ZoomableImageViewer
                                        url={resolveMediaUrl(item.imageUrl)}
                                        onClose={() => setViewerVisible(false)}
                                    />
                                )}
                            </View>
                        )}
                    />
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

                        {selectedMessage?.audioUrl ? (
                            <TouchableOpacity 
                                style={styles.actionModalBtn}
                                onPress={handleDownloadAudio}
                            >
                                <Ionicons name="download-outline" size={24} color={colors.text} />
                                <Text style={[styles.actionModalText, { color: colors.text }]}>Descargar audio</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={styles.actionModalBtn}
                                onPress={handleCopy}
                            >
                                <Ionicons name="copy-outline" size={24} color={colors.text} />
                                <Text style={[styles.actionModalText, { color: colors.text }]}>Copiar texto</Text>
                            </TouchableOpacity>
                        )}
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
                                style={[styles.confirmModalBtn]}
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
    metaText: {
        fontSize: 11,
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
        alignItems: 'center', // Centrado verticalmente con el globo
        paddingHorizontal: 12,
        marginVertical: 2,
    },
    myMessageRow: {
        justifyContent: 'flex-end',
    },
    theirMessageRow: {
        justifyContent: 'flex-start',
    },
    bubbleAvatarContainer: {
        marginRight: 6,
        marginBottom: 2,
    },
    bubbleAvatarContainerRight: {
        marginLeft: 6,
        marginBottom: 2,
    },
    bubbleAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#CCC',
    },
    bubbleWrapper: {
        maxWidth: '75%',
        position: 'relative',
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    myBubble: {
        // Eliminamos las variaciones de radio
    },
    theirBubble: {
        // Eliminamos las variaciones de radio
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
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginHorizontal: 10,
        marginBottom: 8,
        // Elevación suave
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    imagePreviewThumb: {
        width: 36,
        height: 36,
        borderRadius: 10,
        marginRight: 12,
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
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginHorizontal: 10,
        marginBottom: 8,
        gap: 10,
        // Elevación suave para que resalte sobre el fondo
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    uploadStatusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    storyReplyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 8,
        minWidth: 150,
    },
    storyReplyIndicator: {
        width: 3,
        height: '80%',
        borderRadius: 2,
        marginRight: 10,
    },
    storyReplyLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    storyReplyText: {
        fontSize: 12,
    },
    storyReplyThumb: {
        width: 36,
        height: 36,
        borderRadius: 6,
        marginLeft: 10,
        backgroundColor: '#000',
    },
    blockedInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginVertical: 4,
    },
    blockedInfoText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
