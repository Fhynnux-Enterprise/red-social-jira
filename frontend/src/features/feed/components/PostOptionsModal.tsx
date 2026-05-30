import React, { useMemo, useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Modal, 
    TouchableWithoutFeedback, 
    TouchableOpacity, 
    TextInput, 
    Switch, 
    ActivityIndicator, 
    KeyboardAvoidingView, 
    Platform, 
    ScrollView, 
    Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import ConfirmModal from '../../../components/ConfirmModal';
import { useAuth } from '../../auth/context/AuthContext';
import { useMutation } from '@apollo/client/react';
import { SEND_GLOBAL_NOTIFICATION } from '../../moderation/graphql/moderation.operations';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { resolveAvatarUrl, resolveMediaUrl } from '../../../hooks/useChatBackgroundHandler';
import { customToastConfig } from '../../../components/CustomToast';

interface PostOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isOwner?: boolean;
    onReport?: () => void;
    onToggleSave?: () => void;
    isSaved?: boolean;
    post?: any;
}

export default function PostOptionsModal({ 
    visible, 
    onClose, 
    onEdit, 
    onDelete, 
    isOwner = true, 
    onReport, 
    onToggleSave, 
    isSaved = false,
    post
}: PostOptionsModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth() as any;
    const styles = useMemo(() => getStyles(colors, isDark, insets), [colors, isDark, insets]);

    const [showConfirm, setShowConfirm] = useState(false);
    const [showNotificationForm, setShowNotificationForm] = useState(false);

    const isAdmin = user?.role === 'ADMIN';

    const handleDeletePress = () => {
        setShowConfirm(true);
    };

    const confirmDelete = () => {
        setShowConfirm(false);
        onClose();
        onDelete();
    };

    const handleEditPress = () => {
        onClose();
        onEdit();
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.handleIndicator} />

                                <Text style={styles.modalTitle}>Opciones</Text>

                                {isAdmin && post && (
                                    <TouchableOpacity 
                                        style={styles.optionButton} 
                                        onPress={() => {
                                            onClose();
                                            setShowNotificationForm(true);
                                        }}
                                    >
                                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 101, 36, 0.1)' }]}>
                                            <Ionicons name="megaphone" size={20} color="#ff6524" />
                                        </View>
                                        <Text style={[styles.optionText, { color: '#ff6524', fontWeight: 'bold' }]}>Generar notificación</Text>
                                    </TouchableOpacity>
                                )}

                                {isOwner ? (
                                    <>
                                        <TouchableOpacity style={styles.optionButton} onPress={handleEditPress}>
                                            <View style={styles.iconContainer}>
                                                <Ionicons name="pencil" size={20} color={colors.text} />
                                            </View>
                                            <Text style={styles.optionText}>Editar publicación</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.optionButton} onPress={handleDeletePress}>
                                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                                                <Ionicons name="trash" size={20} color="#FF3B30" />
                                            </View>
                                            <Text style={[styles.optionText, { color: '#FF3B30' }]}>Eliminar publicación</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity style={styles.optionButton} onPress={() => { onClose(); onReport?.(); }}>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="flag" size={20} color={colors.text} />
                                        </View>
                                        <Text style={styles.optionText}>Reportar publicación</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity style={styles.optionButton} onPress={() => { onClose(); onToggleSave?.(); }}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? colors.primary : colors.text} />
                                    </View>
                                    <Text style={[styles.optionText, isSaved && { color: colors.primary }]}>
                                        {isSaved ? 'Quitar de guardados' : 'Guardar publicación'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.optionButton, { marginTop: 10 }]} onPress={onClose}>
                                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                                    </View>
                                    <Text style={[styles.optionText, { color: colors.textSecondary }]}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ConfirmModal
                visible={showConfirm}
                title="Eliminar publicación"
                message="¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
                onCancel={() => setShowConfirm(false)}
                onConfirm={confirmDelete}
            />

            {showNotificationForm && post && (
                <GenerateNotificationFromPostModal
                    visible={showNotificationForm}
                    onClose={() => setShowNotificationForm(false)}
                    post={post}
                />
            )}
        </>
    );
}

interface GenerateNotificationFromPostModalProps {
    visible: boolean;
    onClose: () => void;
    post: any;
}

export function GenerateNotificationFromPostModal({ visible, onClose, post }: GenerateNotificationFromPostModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [cityId, setCityId] = useState<'all' | 'chunchi' | 'alausi'>('all');
    const [saveInDb, setSaveInDb] = useState(true);
    const [detailed, setDetailed] = useState(false);
    const [badgeText, setBadgeText] = useState('OFICIAL');
    const [sendAvatar, setSendAvatar] = useState(true);
    const [showConfirmSend, setShowConfirmSend] = useState(false);

    const bodyInputRef = React.useRef<any>(null);
    const imageUrlInputRef = React.useRef<any>(null);
    const badgeTextInputRef = React.useRef<any>(null);

    const [sendGlobalNotification, { loading }] = useMutation(SEND_GLOBAL_NOTIFICATION, {
        onCompleted: (data) => {
            if (data?.sendGlobalNotification) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({
                    type: 'success',
                    text1: 'Éxito',
                    text2: 'La notificación se generó correctamente.',
                    position: 'top',
                });
                onClose();
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo enviar la notificación.',
                    position: 'top',
                });
            }
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('[GenerateNotificationModal] Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error en el servidor',
                text2: error.message || 'Ocurrió un error inesperado.',
                position: 'top',
            });
        }
    });

    useEffect(() => {
        if (visible && post) {
            let initialTitle = '';
            if (post.profession) {
                initialTitle = post.profession;
            } else if (post.title) {
                initialTitle = post.title;
            } else if (post.storeTitle) {
                initialTitle = post.storeTitle;
            } else if (post.postTitle) {
                initialTitle = post.postTitle;
            }

            let initialBody = '';
            if (post.description) {
                initialBody = post.description;
            } else if (post.content) {
                initialBody = post.content;
            }

            let initialImage = '';
            const media = post.media || post.postMedia || post.storeMedia;
            if (Array.isArray(media) && media.length > 0) {
                // Buscamos el primer recurso que sea de tipo imagen
                let firstImage = media.find((m: any) => m.type && m.type.toLowerCase().startsWith('image'));
                
                // Fallback 1: Si no encontramos por tipo, buscamos por extensión de la URL
                if (!firstImage) {
                    firstImage = media.find((m: any) => {
                        const url = (m.url || '').toLowerCase();
                        return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.webp') || url.endsWith('.gif');
                    });
                }
                
                // Fallback 2: Si aún no encontramos, tomamos el primer recurso que no sea de tipo video o extensión de video
                if (!firstImage) {
                    firstImage = media.find((m: any) => {
                        const url = (m.url || '').toLowerCase();
                        const type = (m.type || '').toLowerCase();
                        const isVideo = type.startsWith('video') || url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.m4v');
                        return !isVideo;
                    });
                }

                if (firstImage) {
                    initialImage = firstImage.url || '';
                }
            } else if (typeof post.image === 'string') {
                initialImage = post.image;
            }

            if (initialImage) {
                initialImage = resolveMediaUrl(initialImage);
            }

            // Limpiar si es un texto genérico de ejemplo común en desarrollo
            if (initialTitle && (initialTitle.trim().toLowerCase() === 'ejemplo' || initialTitle.trim().toLowerCase() === 'test')) {
                initialTitle = '';
            }
            if (initialBody && (initialBody.trim().toLowerCase() === 'ejemplo' || initialBody.trim().toLowerCase() === 'test')) {
                initialBody = '';
            }

            setTitle(initialTitle);
            setBody(initialBody);
            setImageUrl(initialImage);
            setCityId('all');
            setSaveInDb(true);
            setDetailed(false);
            setBadgeText('OFICIAL');
            setSendAvatar(true);
        }
    }, [visible, post]);

    const handleSend = () => {
        if (!title.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Campos incompletos',
                text2: 'Por favor completa al menos el título de la notificación.',
                position: 'top',
            });
            return;
        }

        setShowConfirmSend(true);
    };

    const confirmSendNotification = () => {
        setShowConfirmSend(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let typeToUse = 'POST_DETAIL';
        const typename = post?.__typename;
        if (typename === 'StoreProduct' || post?.price !== undefined || post?.seller !== undefined) {
            typeToUse = 'STORE_DETAIL';
        } else if (typename === 'JobOffer' || post?.salary !== undefined) {
            typeToUse = 'JOB_DETAIL';
        } else if (typename === 'ProfessionalProfile' || post?.profession !== undefined) {
            typeToUse = 'SERVICE_DETAIL';
        }

        const rawAvatar = post.author?.photoUrl || post.seller?.photoUrl || post.user?.photoUrl;
        const authorName = post.author?.firstName || post.seller?.firstName || post.user?.firstName || 'U';
        
        let resolvedAvatar = null;
        if (sendAvatar) {
            resolvedAvatar = rawAvatar ? resolveAvatarUrl(rawAvatar, authorName) : resolveAvatarUrl(null, authorName);
        } else {
            resolvedAvatar = imageUrl.trim() || null;
        }

        sendGlobalNotification({
            variables: {
                title: title.trim(),
                body: body.trim(),
                cityId: cityId === 'all' ? null : cityId,
                saveInDb,
                imageUrl: imageUrl.trim() ? resolveMediaUrl(imageUrl.trim()) : null,
                detailed,
                badgeText: badgeText.trim() || 'OFICIAL',
                postId: post.id || post.realId,
                postType: typeToUse,
                authorAvatarUrl: resolvedAvatar
            }
        });
    };

    const styles = React.useMemo(() => getFormStyles(colors, isDark, insets), [colors, isDark, insets]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, backgroundColor: colors.background }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Generar Notificación</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Título de la Notificación</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                            placeholder="Ej. ¡Nuevo servicio disponible!"
                            placeholderTextColor={colors.textSecondary}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={60}
                            importantForAutofill="no"
                            autoComplete="off"
                            textContentType="none"
                            returnKeyType="next"
                            onSubmitEditing={() => bodyInputRef.current?.focus()}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Mensaje / Cuerpo</Text>
                        <TextInput
                            ref={bodyInputRef}
                            style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                            placeholder="Escribe el contenido aquí..."
                            placeholderTextColor={colors.textSecondary}
                            value={body}
                            onChangeText={setBody}
                            multiline
                            numberOfLines={4}
                            maxLength={300}
                            importantForAutofill="no"
                            autoComplete="off"
                            textContentType="none"
                            returnKeyType="next"
                            onSubmitEditing={() => imageUrlInputRef.current?.focus()}
                            blurOnSubmit={true}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Imagen URL (Pre-cargada de la publicación)</Text>
                        <TextInput
                            ref={imageUrlInputRef}
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                            placeholder="Pegue una URL de imagen..."
                            placeholderTextColor={colors.textSecondary}
                            value={imageUrl}
                            onChangeText={setImageUrl}
                            autoCapitalize="none"
                            keyboardType="url"
                            importantForAutofill="no"
                            autoComplete="off"
                            textContentType="none"
                            returnKeyType="next"
                            onSubmitEditing={() => badgeTextInputRef.current?.focus()}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Etiqueta / Tag de la Notificación</Text>
                        <TextInput
                            ref={badgeTextInputRef}
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                            placeholder="Ej. OFICIAL, URGENTE"
                            placeholderTextColor={colors.textSecondary}
                            value={badgeText}
                            onChangeText={setBadgeText}
                            maxLength={20}
                            importantForAutofill="no"
                            autoComplete="off"
                            textContentType="none"
                            returnKeyType="done"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Segmentación por Ciudad</Text>
                        <View style={[styles.segmentedContainer, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}>
                            <TouchableOpacity
                                style={[styles.segmentButton, cityId === 'all' && [styles.segmentActive, { backgroundColor: colors.surface }]]}
                                onPress={() => setCityId('all')}
                            >
                                <Text style={[styles.segmentText, { color: colors.text }, cityId === 'all' && styles.segmentTextActive]}>Global</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segmentButton, cityId === 'chunchi' && [styles.segmentActive, { backgroundColor: colors.surface }]]}
                                onPress={() => setCityId('chunchi')}
                            >
                                <Text style={[styles.segmentText, { color: colors.text }, cityId === 'chunchi' && styles.segmentTextActive]}>Chunchi</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segmentButton, cityId === 'alausi' && [styles.segmentActive, { backgroundColor: colors.surface }]]}
                                onPress={() => setCityId('alausi')}
                            >
                                <Text style={[styles.segmentText, { color: colors.text }, cityId === 'alausi' && styles.segmentTextActive]}>Alausí</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.switchRow, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                        <View style={styles.switchLabelContainer}>
                            <Ionicons name={saveInDb ? "bookmark" : "bookmark-outline"} size={20} color={saveInDb ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.switchLabel, { color: colors.text }]}>Guardar en buzón de Alertas</Text>
                                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Los usuarios verán el aviso en su bandeja.</Text>
                            </View>
                        </View>
                        <Switch
                            value={saveInDb}
                            onValueChange={setSaveInDb}
                            trackColor={{ false: '#767577', true: colors.primary + '66' }}
                            thumbColor={saveInDb ? colors.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={[styles.switchRow, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                        <View style={styles.switchLabelContainer}>
                            <Ionicons name={detailed ? "expand" : "expand-outline"} size={20} color={detailed ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.switchLabel, { color: colors.text }]}>Generar vista detallada (Grande)</Text>
                                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Al pulsar se abrirá una vista completa con foto.</Text>
                            </View>
                        </View>
                        <Switch
                            value={detailed}
                            onValueChange={setDetailed}
                            trackColor={{ false: '#767577', true: colors.primary + '66' }}
                            thumbColor={detailed ? colors.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={[styles.switchRow, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', marginBottom: 30 }]}>
                        <View style={styles.switchLabelContainer}>
                            <Ionicons name={sendAvatar ? "person-circle" : "image"} size={20} color={sendAvatar ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.switchLabel, { color: colors.text }]}>Enviar foto de perfil (Avatar)</Text>
                                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                                    {sendAvatar ? "Muestra el avatar del creador en miniatura." : "Muestra la foto del post en miniatura."}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={sendAvatar}
                            onValueChange={setSendAvatar}
                            trackColor={{ false: '#767577', true: colors.primary + '66' }}
                            thumbColor={sendAvatar ? colors.primary : '#f4f3f4'}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: colors.primary }, loading && { opacity: 0.8 }]}
                        onPress={handleSend}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Ionicons name="paper-plane" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.submitBtnText}>Enviar Notificación</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <ConfirmModal
                visible={showConfirmSend}
                title="Confirmar Envío"
                message={`¿Estás seguro de que deseas generar esta notificación y enviarla a ${
                    cityId === 'all' 
                        ? 'TODOS los usuarios de todas las ciudades' 
                        : `los usuarios de ${cityId === 'chunchi' ? 'Chunchi' : 'Alausí'}`
                }?`}
                confirmText="Enviar Ahora"
                cancelText="Cancelar"
                isDestructive={false}
                onCancel={() => setShowConfirmSend(false)}
                onConfirm={confirmSendNotification}
            />

            <Toast config={customToastConfig} position="top" topOffset={60} />
        </Modal>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean, insets: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handleIndicator: {
        width: 40,
        height: 5,
        backgroundColor: isDark ? '#444' : '#DDD',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#333' : '#F0F0F0',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? '#333' : '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    optionText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
});

const getFormStyles = (colors: ThemeColors, isDark: boolean, insets: any) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: insets.top + 10,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    closeBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
    },
    input: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    segmentedContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        justifyContent: 'space-between',
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    segmentActive: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.7,
    },
    segmentTextActive: {
        fontWeight: '700',
        opacity: 1,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    switchLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    switchSub: {
        fontSize: 11,
        marginTop: 2,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
