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
    Platform,
    Image,
    ScrollView,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Video as Compressor } from 'react-native-compressor';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { GET_ME } from '../../profile/graphql/profile.operations';

interface CreateStoryModalProps {
    visible: boolean;
    onClose: () => void;
    onStoryCreated?: () => void;
}

export default function CreateStoryModal({ visible, onClose, onStoryCreated }: CreateStoryModalProps) {
    const { colors } = useTheme();
    const [content, setContent] = React.useState('');
    const [media, setMedia] = React.useState<{
        uri: string;
        type: string;
        mimeType: string;
    } | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'uploading' | 'done'>('idle');
    const [progress, setProgress] = useState(0);

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

    const { data: meData } = useQuery<any>(GET_ME, { fetchPolicy: 'cache-only' });
    const currentUser = meData?.me;

    const [createStory, { loading: creating }] = useMutation(gql`
        mutation CreateStory($mediaUrl: String!, $mediaType: String!, $content: String) {
          createStory(mediaUrl: $mediaUrl, mediaType: $mediaType, content: $content) {
            id
            mediaUrl
            mediaType
          }
        }
    `, {
        refetchQueries: ['getActiveStories']
    });

    React.useEffect(() => {
        if (visible) {
            setContent('');
            setMedia(null);
            setUploadStatus('idle');
            setProgress(0);
        }
    }, [visible]);

    const styles = useMemo(() => getStyles(colors), [colors]);

    const handlePickMedia = async () => {
        try {
            const results = await pickMultipleMedia('All');
            if (results && results.length > 0) {
                const res = results[0];
                const type = res.mimeType.startsWith('video/') ? 'video' : 'image';
                
                // Validación de duración: Máximo 45 segundos (45000ms)
                if (type === 'video' && res.duration && res.duration > 45000) {
                    setAlertConfig({
                        visible: true,
                        title: "Video muy largo",
                        message: "El video que intentas subir excede el límite de 45 segundos permitido para historias.",
                        buttons: [{ text: "Entendido", onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }]
                    });
                    return;
                }

                setMedia({
                    uri: res.localUri,
                    type,
                    mimeType: res.mimeType
                });
            }
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        }
    };

    const handlePublish = async () => {
        if (!media) return;

        try {
            setUploadStatus('compressing');
            let finalUri = media.uri;

            let interval: any;
            if (media.type === 'video') {
                interval = setInterval(() => {
                    setProgress(prev => (prev < 90 ? prev + 5 : 90));
                }, 300);
                
                try {
                    finalUri = await Compressor.compress(media.uri, { compressionMethod: 'auto', maxSize: 720 });
                } finally {
                    clearInterval(interval);
                }
            }

            setUploadStatus('uploading');
            setProgress(50);
            const uploadedUrl = await uploadMedia(finalUri, media.mimeType, 'stories');
            
            setProgress(100);
            setUploadStatus('done');

            await createStory({ 
                variables: { 
                    mediaUrl: uploadedUrl, 
                    mediaType: media.type, 
                    content: content.trim() || null 
                } 
            });

            Toast.show({ type: 'success', text1: '¡Historia publicada!', text2: 'Se verá por 24 horas.' });
            onStoryCreated?.();
            onClose();

        } catch (error: any) {
            setUploadStatus('idle');
            Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        }
    };

    const isBusy = creating || (uploadStatus !== 'idle' && uploadStatus !== 'done');

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Nueva Historia</Text>
                        <TouchableOpacity
                            style={[styles.publishButton, (!media || isBusy) && styles.publishButtonDisabled]}
                            onPress={handlePublish}
                            disabled={!media || isBusy}
                        >
                            <Text style={styles.publishText}>{isBusy ? 'Subiendo...' : 'Compartir'}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                        <View style={styles.userInfo}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                                {currentUser?.photoUrl ? (
                                    <Image source={{ uri: currentUser.photoUrl }} style={styles.avatar} />
                                ) : (
                                    <Ionicons name="person" size={24} color={colors.textSecondary} />
                                )}
                            </View>
                            <Text style={styles.userName}>{currentUser?.firstName} {currentUser?.lastName}</Text>
                        </View>

                        <TextInput
                            style={styles.captionInput}
                            placeholder="Añade un pie de foto a tu historia..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            value={content}
                            onChangeText={setContent}
                            editable={!isBusy}
                        />

                        {media ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: media.uri }} style={styles.preview} resizeMode="cover" />
                                <TouchableOpacity style={styles.removeBtn} onPress={() => setMedia(null)} disabled={isBusy}>
                                    <Ionicons name="close-circle" size={32} color="rgba(0,0,0,0.7)" />
                                </TouchableOpacity>
                                {isBusy && (
                                    <View style={styles.busyOverlay}>
                                        <ActivityIndicator size="large" color="#FFF" />
                                        <Text style={styles.busyText}>
                                            {uploadStatus === 'compressing' ? 'Optimizando...' : 'Subiendo...'} {progress}%
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.pickBtn} onPress={handlePickMedia}>
                                <Ionicons name="camera" size={48} color={colors.primary} />
                                <Text style={[styles.pickText, { color: colors.primary }]}>Elegir foto o video</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    {/* Custom Luxury Alert */}
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

                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    publishButton: {
        backgroundColor: '#FF4511',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    publishButtonDisabled: { opacity: 0.5 },
    publishText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    content: { flex: 1, padding: 16 },
    userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    userName: { color: colors.text, fontWeight: 'bold', fontSize: 16 },
    captionInput: {
        color: colors.text,
        fontSize: 18,
        lineHeight: 24,
        marginBottom: 20,
        minHeight: 60,
    },
    previewContainer: {
        width: '100%',
        aspectRatio: 9 / 16,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        position: 'relative',
    },
    preview: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 12, right: 12 },
    busyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    busyText: { color: '#FFF', fontWeight: 'bold', marginTop: 10 },
    pickBtn: {
        width: '100%',
        aspectRatio: 9 / 16,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    pickText: { marginTop: 12, fontWeight: 'bold', fontSize: 16 },
    // Custom Alert Styles
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
    }
});
