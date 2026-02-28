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
import { useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { CREATE_POST, GET_POSTS } from '../graphql/posts.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';

interface CreatePostModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function CreatePostModal({ visible, onClose }: CreatePostModalProps) {
    const { colors } = useTheme();
    const [content, setContent] = useState('');
    const insets = useSafeAreaInsets();

    // Generamos estilos dinámicos que reaccionan al tema
    const styles = useMemo(() => getStyles(colors), [colors]);

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

    const handlePublish = async () => {
        if (!content.trim()) return;
        await createPost({ variables: { content } });
    };

    const handleClose = () => {
        setContent(''); // Clean the input when closing
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
                        <Text style={styles.headerTitle}>Crear publicación</Text>
                        <TouchableOpacity
                            style={[styles.publishButton, (!content.trim() || creating) && styles.publishButtonDisabled]}
                            onPress={handlePublish}
                            disabled={!content.trim() || creating}
                            activeOpacity={0.8}
                        >
                            {creating ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.publishText}>Publicar</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Editor Area */}
                    <View style={styles.editorContainer}>
                        <View style={styles.userInfo}>
                            <View style={styles.smallAvatarPlaceholder}>
                                <Ionicons name="person" size={20} color={colors.textSecondary} />
                            </View>
                            <Text style={styles.userName}>Tú</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="¿Qué está pasando en Chunchi?"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            autoFocus={true}
                            value={content}
                            onChangeText={setContent}
                            editable={!creating}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Toolbar Opciones de Publicación */}
                    <View style={styles.toolbar}>
                        <TouchableOpacity style={styles.toolbarOption}>
                            <Ionicons name="image" size={24} color="#45BD62" />
                            <Text style={styles.toolbarOptionText}>Foto/video</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolbarOption}>
                            <Ionicons name="person-add" size={24} color="#1877F2" />
                            <Text style={styles.toolbarOptionText}>Etiquetar personas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolbarOption}>
                            <Ionicons name="location" size={24} color="#F5533D" />
                            <Text style={styles.toolbarOptionText}>Ubicación</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolbarOption}>
                            <Ionicons name="happy" size={24} color="#F7B928" />
                            <Text style={styles.toolbarOptionText}>Sentimiento/actividad</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
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
        paddingBottom: 8,
    },
    toolbarOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    toolbarOptionText: {
        color: colors.text,
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
    }
});
