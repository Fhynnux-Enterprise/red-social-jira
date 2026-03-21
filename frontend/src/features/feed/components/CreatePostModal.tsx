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
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { CREATE_POST, UPDATE_POST, GET_POSTS } from '../graphql/posts.operations';
import { GET_ME } from '../../profile/graphql/profile.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';

interface CreatePostModalProps {
    visible: boolean;
    onClose: () => void;
    initialContent?: string;
    postId?: string;
}

export default function CreatePostModal({ visible, onClose, initialContent = '', postId }: CreatePostModalProps) {
    const { colors } = useTheme();
    const [content, setContent] = React.useState(initialContent);
    const [localMediaList, setLocalMediaList] = React.useState<{ uri: string, type: string, mimeType: string }[]>([]);
    const [isUploadingMedia, setIsUploadingMedia] = React.useState(false);
    const insets = useSafeAreaInsets();
    const { pickMultipleMedia, uploadMedia } = useMediaUpload();

    React.useEffect(() => {
        if (visible) {
            setContent(initialContent);
            setLocalMediaList([]);
            setIsUploadingMedia(false);
        }
    }, [visible, initialContent]);

    // Generamos estilos dinámicos que reaccionan al tema
    const styles = useMemo(() => getStyles(colors), [colors]);

    const { data: meData } = useQuery(GET_ME, {
        fetchPolicy: 'cache-only', // Since the feed already fetches it, we can read it from cache
    });
    const currentUser = meData?.me;

    const [createPost, { loading: creating }] = useMutation(CREATE_POST, {
        onCompleted: () => {
            setContent('');
            Toast.show({ type: 'success', text1: '¡Publicado!', text2: 'Tu post está ahora en el Feed.' });
            onClose();
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        },
        refetchQueries: [{ query: GET_POSTS }],
    });

    const [updatePost, { loading: updating }] = useMutation(UPDATE_POST, {
        onCompleted: () => {
            setContent('');
            Toast.show({ type: 'success', text1: '¡Actualizado!', text2: 'La publicación fue modificada' });
            onClose();
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        },
        refetchQueries: [{ query: GET_POSTS }],
    });

    const isLoading = creating || updating || isUploadingMedia;

    const handlePickMedia = async () => {
        const results = await pickMultipleMedia('All');
        if (results && results.length > 0) {
            const newMedia = results.map(res => ({
                uri: res.localUri,
                type: res.mimeType.startsWith('video/') ? 'video' : 'image',
                mimeType: res.mimeType
            }));
            setLocalMediaList(prev => [...prev, ...newMedia]);
        }
    };

    const handlePublish = async () => {
        if (!content.trim() && localMediaList.length === 0) return;
        
        try {
            let mediaInput: { url: string, type: string, order: number }[] = [];

            if (localMediaList.length > 0) {
                setIsUploadingMedia(true);
                const uploadPromises = localMediaList.map(async (media, index) => {
                    const uploadedUrl = await uploadMedia(media.uri, media.mimeType, 'posts');
                    return {
                        url: uploadedUrl,
                        type: media.type,
                        order: index
                    };
                });
                mediaInput = await Promise.all(uploadPromises);
                setIsUploadingMedia(false);
            }

            if (postId) {
                await updatePost({ variables: { id: postId, content } }); // For now simplified edit
            } else {
                await createPost({ variables: { content, media: mediaInput.length > 0 ? mediaInput : null } });
            }
        } catch (error: any) {
            setIsUploadingMedia(false);
            Toast.show({ type: 'error', text1: 'Error subiendo archivo', text2: error.message });
        }
    };

    const handleClose = () => {
        setContent(''); // Clean the input when closing
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
                                <ActivityIndicator size="small" color="#FFF" />
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
                                        <TouchableOpacity
                                            style={styles.removeMediaButton}
                                            onPress={() => setLocalMediaList(prev => prev.filter((_, i) => i !== index))}
                                        >
                                            <Ionicons name="close-circle" size={24} color="rgba(0,0,0,0.7)" />
                                        </TouchableOpacity>
                                        {mediaItem.type === 'video' ? (
                                            <View style={[styles.mediaPreview, { justifyContent: 'center', alignItems: 'center' }]}>
                                               <Ionicons name="play-circle" size={48} color="#FFF" style={{ position: 'absolute', zIndex: 10 }} />
                                               <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} />
                                            </View>
                                        ) : (
                                            <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} resizeMode="cover" />
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </ScrollView>

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
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 15,
        padding: 2,
    }
});
