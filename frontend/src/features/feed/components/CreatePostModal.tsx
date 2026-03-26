import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Alert } from 'react-native';
import { Video as Compressor } from 'react-native-compressor';
import { CREATE_POST, UPDATE_POST, GET_POSTS } from '../graphql/posts.operations';
import { GET_ME } from '../../profile/graphql/profile.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { useAuth } from '../../auth/context/AuthContext';

interface CreatePostModalProps {
    visible: boolean;
    onClose: () => void;
    initialContent?: string;
    initialTitle?: string;
    postId?: string;
}

const MAX_TITLE_LENGTH = 100;

export default function CreatePostModal({ visible, onClose, initialContent = '', initialTitle = '', postId }: CreatePostModalProps) {
    const { colors } = useTheme();
    const [content, setContent] = React.useState(initialContent);
    const [title, setTitle] = React.useState(initialTitle);
    const [localMediaList, setLocalMediaList] = React.useState<{
        uri: string,
        type: string,
        mimeType: string,
        isValid: boolean,
        errorMessage?: string,
        uploadStatus?: 'idle' | 'compressing' | 'uploading' | 'done' | 'error',
        progress: number
    }[]>([]);
    const [isUploadingMedia, setIsUploadingMedia] = React.useState(false);
    const { userToken } = useAuth();

    // Resetear contenido y cerrar modal si la sesión expira
    React.useEffect(() => {
        if (!userToken && visible) {
            handleClose();
        }
    }, [userToken, visible]);

    // Estado para alertas personalizadas
    const [alertConfig, setAlertConfig] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        buttons: { text: string; onPress: () => void; style?: 'cancel' | 'default' }[];
    }>({
        visible: false,
        title: '',
        message: '',
        buttons: []
    });

    const insets = useSafeAreaInsets();
    const { pickMultipleMedia, uploadMedia } = useMediaUpload();

    React.useEffect(() => {
        if (visible) {
            setContent(initialContent);
            setTitle(initialTitle);
            setLocalMediaList([]);
            setIsUploadingMedia(false);
        }
    }, [visible, initialContent, initialTitle]);

    // Generamos estilos dinámicos que reaccionan al tema
    const styles = useMemo(() => getStyles(colors), [colors]);

    const { data: meData } = useQuery<any>(GET_ME, {
        fetchPolicy: 'cache-only', // Since the feed already fetches it, we can read it from cache
    });
    const currentUser = meData?.me;

    const [createPost, { loading: creating }] = useMutation(CREATE_POST, {
        refetchQueries: [{ query: GET_POSTS }],
    });

    const [updatePost, { loading: updating }] = useMutation(UPDATE_POST, {
        refetchQueries: [{ query: GET_POSTS }],
    });

    const isLoading = creating || updating || isUploadingMedia;

    const handlePickMedia = async () => {
        const results = await pickMultipleMedia('All');
        if (results && results.length > 0) {
            // Tarea 1: Marcado de Estado Individual y Validación
            const newMedia = results.map(res => {
                const type = res.mimeType.startsWith('video/') ? 'video' : 'image';
                let isValid = true;
                let errorMessage = '';

                // Regla 1: Duración de video > 1 minuto (milisegundos)
                if (type === 'video' && res.duration && res.duration > 60000) {
                    isValid = false;
                    errorMessage = 'Máx 1 minuto';
                }

                return {
                    uri: res.localUri,
                    type,
                    mimeType: res.mimeType,
                    isValid,
                    errorMessage,
                    duration: res.duration,
                    uploadStatus: 'idle' as const,
                    progress: 0
                };
            });

            // Combinamos con lo que ya tenemos
            const updatedTotal = [...localMediaList, ...newMedia];

            // Regla 2: Límite de 3 videos en total
            let videoCount = 0;
            const validatedList = updatedTotal.map((item, index) => {
                if (item.type === 'video') {
                    videoCount++;
                    if (videoCount > 3) {
                        return { ...item, isValid: false, errorMessage: 'Límite de videos' };
                    }
                }

                // Regla 3: Máximo 10 archivos en total
                if (index >= 10) {
                    return { ...item, isValid: false, errorMessage: 'Límite 10 archivos' };
                }

                return item;
            });

            setLocalMediaList(validatedList);
        }
    };

    const handlePublish = async () => {
        if (!content.trim() && localMediaList.length === 0) return;

        // Verificación de archivos inválidos
        const hasInvalidItems = localMediaList.some(m => !m.isValid);

        if (hasInvalidItems) {
            setAlertConfig({
                visible: true,
                title: "Contenido no permitido",
                message: "Algunos de tus archivos exceden los límites de la plataforma y no serán incluidos en la publicación. ¿Deseas subir el contenido válido de todos modos?",
                buttons: [
                    { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
                    {
                        text: "Publicar válidos", onPress: () => {
                            setAlertConfig(p => ({ ...p, visible: false }));
                            processUpload(true);
                        }
                    }
                ]
            });
        } else {
            processUpload(false);
        }
    };

    const processUpload = async (filterInvalid: boolean) => {
        const mediaToUpload = filterInvalid
            ? localMediaList.filter(m => m.isValid)
            : localMediaList;

        // Validación de seguridad corregida y estilizada
        if (mediaToUpload.length === 0 && !content.trim()) {
            setAlertConfig({
                visible: true,
                title: "Publicación sin contenido",
                message: "No queda contenido válido para publicar. Por favor, asegúrate de añadir texto o archivos que cumplan con los límites de tiempo y cantidad.",
                buttons: [
                    { text: "Entendido", onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }
                ]
            });
            return;
        }

        try {
            let mediaInput: { url: string, type: string, order: number }[] = [];

            if (mediaToUpload.length > 0) {
                setIsUploadingMedia(true);
                const uploadPromises = mediaToUpload.map(async (media, index) => {
                    let finalUri = media.uri;
                    const mediaIndex = localMediaList.findIndex(m => m.uri === media.uri);

                    // Función para simular porcentaje fluido
                    const startProgress = (status: any) => {
                        let currentProgress = 0;
                        const interval = setInterval(() => {
                            currentProgress += Math.random() * 15;
                            if (currentProgress >= 90) {
                                clearInterval(interval);
                                currentProgress = 90;
                            }
                            setLocalMediaList(prev => prev.map(m => m.uri === media.uri ? { ...m, uploadStatus: status, progress: Math.floor(currentProgress) } : m));
                        }, 200);
                        return interval;
                    };

                    // 1. Fase de Compresión
                    if (media.type === 'video') {
                        const compInterval = startProgress('compressing');
                        try {
                            finalUri = await Compressor.compress(media.uri, {
                                compressionMethod: 'auto',
                                maxSize: 720
                            });
                        } finally {
                            clearInterval(compInterval);
                        }
                    }

                    // 2. Fase de Subida Real
                    const uploadInterval = startProgress('uploading');
                    try {
                        const uploadedUrl = await uploadMedia(finalUri, media.mimeType, 'posts');
                        clearInterval(uploadInterval);

                        // 3. ¡Terminado al 100%!
                        setLocalMediaList(prev => prev.map(m => m.uri === media.uri ? { ...m, uploadStatus: 'done' as const, progress: 100 } : m));

                        return {
                            url: uploadedUrl,
                            type: media.type,
                            order: index
                        };
                    } catch (error) {
                        clearInterval(uploadInterval);
                        throw error;
                    }
                });
                mediaInput = await Promise.all(uploadPromises);
            }

            if (postId) {
                await updatePost({ variables: { id: postId, content, title: title.trim() || null } });
                setContent('');
                setTitle('');
                Toast.show({ type: 'success', text1: '¡Actualizado!', text2: 'La publicación fue modificada' });
                onClose();
            } else {
                await createPost({ variables: { content, title: title.trim() || null, media: mediaInput.length > 0 ? mediaInput : null } });
                setContent('');
                setTitle('');
                Toast.show({ type: 'success', text1: '¡Publicado!', text2: 'Tu post está ahora en el Feed.' });
                onClose();
            }
        } catch (error: any) {
            setIsUploadingMedia(false);
            Toast.show({ type: 'error', text1: 'Error en la subida', text2: error.message });
        } finally {
            setIsUploadingMedia(false);
        }
    };

    const handleClose = () => {
        setContent(''); // Clean the input when closing
        setTitle('');
        setLocalMediaList([]);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : insets.bottom }]}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{postId ? 'Editar publicación' : 'Crear publicación'}</Text>
                        <TouchableOpacity
                            style={[styles.publishButton, (!content.trim() && localMediaList.length === 0 || isLoading) && styles.publishButtonDisabled]}
                            onPress={handlePublish}
                            disabled={(!content.trim() && localMediaList.length === 0) || isLoading}
                        >
                            {isLoading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color="#FFF" />
                                    <Text style={[styles.publishText, { marginLeft: 8 }]}>Subiendo...</Text>
                                </View>
                            ) : (
                                <Text style={styles.publishText}>{postId ? 'Guardar' : 'Publicar'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Editor Area */}
                    <ScrollView style={styles.editorContainer} keyboardShouldPersistTaps="handled">
                        <View style={styles.userInfo}>
                            <View style={[styles.smallAvatarPlaceholder, { overflow: 'hidden', backgroundColor: currentUser && !currentUser.photoUrl ? 'rgba(255, 101, 36, 0.15)' : colors.surface }]}>
                                {currentUser?.photoUrl ? (
                                    <Image source={{ uri: currentUser.photoUrl }} style={{ width: '100%', height: '100%' }} />
                                ) : currentUser ? (
                                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                                        {currentUser.firstName?.charAt(0) || ''}{currentUser.lastName?.charAt(0) || ''}
                                    </Text>
                                ) : (
                                    <Ionicons name="person" size={20} color={colors.textSecondary} />
                                )}
                            </View>
                            <Text style={styles.userName}>
                                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Tú'}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
                            <TextInput
                                style={[styles.titleInput, { flex: 1, paddingTop: 0 }]}
                                placeholder="Añade un título (opcional)..."
                                placeholderTextColor={colors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                editable={!isLoading}
                                maxLength={MAX_TITLE_LENGTH}
                                multiline
                            />
                            <Text style={[
                                styles.charCounter, 
                                title.length >= 90 ? { color: '#ff4444' } : { color: colors.textSecondary },
                                { marginTop: 4 }
                            ]}>
                                {title.length} / {MAX_TITLE_LENGTH}
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="¿Qué está pasando en Chunchi?"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            autoFocus={true}
                            value={content}
                            onChangeText={setContent}
                            editable={!isLoading}
                            textAlignVertical="top"
                            scrollEnabled={false} // Since it's inside a ScrollView now
                        />

                        {/* Media Preview - Horizontal Scroll */}
                        {localMediaList.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewListContainer}>
                                {localMediaList.map((mediaItem, index) => (
                                    <View key={index} style={styles.mediaPreviewContainer}>
                                        {/* 1. La Imagen/Video Base */}
                                        {mediaItem.type === 'video' ? (
                                            <View style={styles.mediaPreview}>
                                                <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} />
                                                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                                                    <Ionicons name="play-circle" size={40} color="#FFF" />
                                                </View>
                                            </View>
                                        ) : (
                                            <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} resizeMode="cover" />
                                        )}

                                        {/* Indicador de "Listo para subir" (Check azul en esquina) */}
                                        {mediaItem.isValid && (!mediaItem.uploadStatus || mediaItem.uploadStatus === 'idle') && (
                                            <View style={styles.readyBadge}>
                                                <Ionicons name="checkmark-done-circle" size={24} color="#007AFF" />
                                            </View>
                                        )}

                                        {/* 2. Botón de Eliminar (Solo si NO está subiendo) */}
                                        {(!mediaItem.uploadStatus || mediaItem.uploadStatus === 'idle') && (
                                            <TouchableOpacity
                                                style={styles.removeMediaButton}
                                                onPress={() => setLocalMediaList(prev => prev.filter((_, i) => i !== index))}
                                            >
                                                <Ionicons name="close-circle" size={26} color="rgba(0,0,0,0.8)" />
                                            </TouchableOpacity>
                                        )}

                                        {/* 3. Feedback Visual Overlay de Error (Inválidos) */}
                                        {!mediaItem.isValid && (
                                            <View style={styles.invalidOverlay}>
                                                <Ionicons name="close-outline" size={32} color="#FFF" />
                                                <Text style={styles.invalidText}>{mediaItem.errorMessage}</Text>
                                            </View>
                                        )}

                                        {/* 4. Feedback Visual Overlay de Subida (Activo) */}
                                        {mediaItem.uploadStatus && mediaItem.uploadStatus !== 'idle' && (
                                            <View style={[
                                                styles.uploadOverlay,
                                                mediaItem.uploadStatus === 'done' && styles.uploadDoneOverlay
                                            ]}>
                                                {mediaItem.uploadStatus === 'done' ? (
                                                    <View style={styles.doneBadge}>
                                                        <Ionicons name="checkmark-circle" size={32} color="#4ADE80" />
                                                    </View>
                                                ) : (
                                                    <View style={styles.uploadingStatusContainer}>
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                        <View style={{ marginLeft: 4 }}>
                                                            <Text style={styles.uploadingLabel}>
                                                                {mediaItem.uploadStatus === 'compressing' ? 'Optimizando...' : 'Subiendo...'}
                                                            </Text>
                                                            <Text style={styles.progressText}>{mediaItem.progress}%</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </ScrollView>

                    {/* Alerta Estilizada Personalizada */}
                    <Modal visible={alertConfig.visible} transparent animationType="fade">
                        <View style={styles.alertOverlay}>
                            <View style={styles.alertContent}>
                                <Text style={styles.alertTitle}>{alertConfig.title}</Text>
                                <Text style={styles.alertMessage}>{alertConfig.message}</Text>
                                <View style={styles.alertButtonsContainer}>
                                    {alertConfig.buttons.map((btn, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.alertButton, btn.style === 'cancel' ? styles.alertCancelButton : styles.alertConfirmButton]}
                                            onPress={btn.onPress}
                                        >
                                            <Text style={[styles.alertButtonText, btn.style === 'cancel' && { color: colors.textSecondary }]}>
                                                {btn.text}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Toolbar Opciones de Publicación */}
                    <View style={styles.toolbar}>
                        <TouchableOpacity style={styles.mediaButton} activeOpacity={0.7} onPress={handlePickMedia}>
                            <View style={styles.mediaButtonIconGradientWrapper}>
                                <MaskedView
                                    style={{ width: 24, height: 24 }}
                                    maskElement={<Ionicons name="image" size={24} color="black" />}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.secondary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{ flex: 1 }}
                                    />
                                </MaskedView>
                            </View>
                            <Text style={styles.mediaButtonText}>Añadir foto o video</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View >
        </Modal >
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    publishButton: {
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    publishButtonDisabled: {
        opacity: 0.5,
    },
    publishText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    editorContainer: {
        flex: 1,
        padding: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    smallAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userName: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    titleInput: {
        color: colors.text,
        fontSize: 20, // Increased from 19 to 20
        fontWeight: 'bold',
        marginBottom: 0,
    },
    charCounter: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 18,
        lineHeight: 26,
    },
    toolbar: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    mediaButtonIconGradientWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 101, 36, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    mediaButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: 'bold',
    },
    mediaPreviewListContainer: {
        marginTop: 16,
        marginBottom: 20,
    },
    mediaPreviewContainer: {
        width: 250,
        height: 312, // Taller portrait aspect ratio to match the feed changes
        marginRight: 12,
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    mediaPreview: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surface,
    },
    removeMediaButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 20,
        borderRadius: 15,
        padding: 2,
    },
    invalidOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    invalidText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 4,
    },
    // Estilos del Alerta Personalizado (Luxury Minimal)
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    alertContent: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    alertTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    postTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 14,
        marginBottom: 6,
    },
    alertMessage: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 24,
    },
    alertButtonsContainer: {
        width: '100%',
        gap: 12,
    },
    alertButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    alertConfirmButton: {
        backgroundColor: colors.primary,
    },
    alertCancelButton: {
        backgroundColor: colors.border,
    },
    alertButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // Nuevos estilos de Feedback de subida rediseñados
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
    },
    uploadDoneOverlay: {
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    uploadingStatusContainer: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    uploadingLabel: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12,
    },
    doneBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 16,
    },
    doneText: {
        color: '#4ADE80',
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: 5,
    },
    readyBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        padding: 2,
        zIndex: 14,
    },
    progressText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: -2,
    }
});
