import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Platform, StyleSheet,
    Image, ActivityIndicator, TouchableWithoutFeedback,
    Alert, Pressable, Keyboard, ScrollView, Modal,
    Dimensions, TextInput,
    PanResponder, Animated,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { GET_COMMENTS, CREATE_COMMENT } from '../graphql/comments.operations';
import { TOGGLE_LIKE } from '../../feed/graphql/posts.operations';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 60) return `${Math.max(1, diffMins)} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays <= 30) return `Hace ${diffDays} día(s)`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const formatDate = (isoString: string) => {
    const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
    const date = new Date(utcString);
    const hoy = new Date();
    const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === hoy.toDateString()) return `Hoy a las ${timeString}`;
    if (date.toDateString() === ayer.toDateString()) return `Ayer a las ${timeString}`;
    return `${date.toLocaleDateString()} a las ${timeString}`;
};

export interface CommentsModalProps {
    visible: boolean;
    post: any | null;
    onClose: () => void;
}

export default function CommentsModal({ visible, post, onClose }: CommentsModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
    const [content, setContent] = useState('');
    const postId = post?.id;

    // ── Animación entrada/salida + drag ────────────────────────────────────
    // panY=0 → abierto, panY=SCREEN_HEIGHT → fuera de pantalla (cerrado)
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const closeWithAnimation = () => {
        Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 260,
            useNativeDriver: true,
        }).start(() => {
            panY.setValue(SCREEN_HEIGHT);
            onClose();
        });
    };

    React.useEffect(() => {
        if (visible) {
            panY.setValue(SCREEN_HEIGHT);
            Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 14,
            }).start();
        }
    }, [visible]);

    // ── Teclado: animar bottom para que el input no quede tapado ───────────────
    const keyboardOffset = useRef(new Animated.Value(Math.max(insets.bottom, 16))).current;

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            Animated.timing(keyboardOffset, {
                toValue: Math.max(insets.bottom, 16) + e.endCoordinates.height,
                duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
                useNativeDriver: false,
            }).start();
        });
        const hideSub = Keyboard.addListener(hideEvent, (e) => {
            Animated.timing(keyboardOffset, {
                toValue: Math.max(insets.bottom, 16),
                duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
                useNativeDriver: false,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const makeDragPan = () => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && g.dy > 0,
        onPanResponderMove: (_, g) => {
            if (g.dy > 0) panY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
            const shouldClose = g.dy > 80 || g.vy > 0.8;
            if (shouldClose) {
                closeWithAnimation();
            } else {
                Animated.spring(panY, {
                    toValue: 0, useNativeDriver: true, bounciness: 6,
                }).start();
            }
        },
    });

    const postHeaderPan = useRef(makeDragPan()).current;
    const commentsHeaderPan = useRef(makeDragPan()).current;


    // ── Likes ────────────────────────────────────────────────────────────────
    const displayLiked = post?.likes?.some((l: any) => l.user?.id === currentUser?.id) || false;
    const [localLiked, setLocalLiked] = useState(displayLiked);
    const [localCount, setLocalCount] = useState<number>(post?.likes?.length || 0);
    const [toggleLikeMutation] = useMutation(TOGGLE_LIKE);

    const handleLike = () => {
        const next = !localLiked;
        setLocalLiked(next);
        setLocalCount((c) => next ? c + 1 : Math.max(0, c - 1));
        toggleLikeMutation({ variables: { postId } }).catch(() => {
            setLocalLiked(!next);
            setLocalCount((c) => !next ? c + 1 : Math.max(0, c - 1));
        });
    };

    // ── Comments ─────────────────────────────────────────────────────────────
    const { data, loading, error, refetch } = useQuery(GET_COMMENTS, {
        variables: { postId },
        skip: !postId,
        fetchPolicy: 'cache-and-network',
    });

    const [createComment, { loading: creating }] = useMutation(CREATE_COMMENT, {
        update(cache, { data: { createComment: newComment } }) {
            if (!postId) return;
            const existing = cache.readQuery<{ getCommentsByPost: any[] }>({
                query: GET_COMMENTS, variables: { postId },
            });
            if (existing) {
                cache.writeQuery({
                    query: GET_COMMENTS, variables: { postId },
                    data: { getCommentsByPost: [...existing.getCommentsByPost, newComment] },
                });
            }
        },
    });

    const handleSend = async () => {
        if (!content.trim() || !postId) return;
        try {
            await createComment({ variables: { postId, content: content.trim() } });
            setContent('');
            Keyboard.dismiss();
        } catch (e) { console.error(e); }
    };

    // ── Render comentario ────────────────────────────────────────────────────
    const renderComment = (item: any) => {
        const author = item.user;
        const isMyComment = author?.id === currentUser?.id;

        const handleLongPress = () => {
            if (!isMyComment) return;
            Alert.alert('Opciones del comentario', '', [
                { text: 'Eliminar', style: 'destructive', onPress: () => console.log('Eliminar:', item.id) },
                { text: 'Editar', onPress: () => console.log('Editar:', item.id) },
                { text: 'Cancelar', style: 'cancel' },
            ]);
        };

        return (
            <Pressable
                key={item.id}
                onLongPress={handleLongPress}
                delayLongPress={250}
                style={({ pressed }) => [
                    styles.commentCard,
                    { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent', borderRadius: 8, padding: 4 },
                ]}
            >
                <View style={styles.avatarPlaceholder}>
                    {author?.photoUrl
                        ? <Image source={{ uri: author.photoUrl }} style={styles.avatarImage} />
                        : <Text style={styles.avatarText}>{author?.firstName?.[0] || ''}{author?.lastName?.[0] || ''}</Text>
                    }
                </View>
                <View style={styles.commentContent}>
                    <Text style={[styles.authorName, { color: colors.textSecondary }]}>
                        {author?.firstName} {author?.lastName}
                    </Text>
                    <Text style={[styles.textContent, { color: colors.text }]}>{item.content}</Text>
                    <View style={styles.commentFooter}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            {formatTimeAgo(new Date(item.createdAt))}
                        </Text>
                        <TouchableOpacity>
                            <Text style={[styles.replyText, { color: colors.textSecondary }]}>Responder</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity style={styles.likeContainer}>
                    <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </Pressable>
        );
    };

    if (!visible) return null;

    const commentsCount = post?.comments?.length || 0;
    const isEdited = post?.updatedAt &&
        new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 2000;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeWithAnimation} statusBarTranslucent>

            {/* Fondo oscuro — cubre toda la pantalla */}
            <TouchableWithoutFeedback onPress={closeWithAnimation}>
                <View style={StyleSheet.absoluteFill}>
                    <View style={styles.backdrop} />
                </View>
            </TouchableWithoutFeedback>

            {/* Contenedor EXTERIOR: solo mueve bottom con el teclado (JS driver) */}
            <Animated.View
                style={[
                    styles.container,
                    {
                        top: insets.top + 20,
                        bottom: keyboardOffset,
                    },
                ]}
                pointerEvents="box-none"
            >
            {/* Contenedor INTERIOR: sigue el dedo con translateY (native driver) */}
            <Animated.View
                style={[
                    { flex: 1, gap: 8 },
                    { transform: [{ translateY: panY }] },
                ]}
            >
                    {/* ── BURBUJA SUPERIOR: Publicación ── */}
                    {post && (
                        <View style={[styles.postBubble, { backgroundColor: colors.surface }]}>

                            {/* Cabecera FIJA — arrastrando aquí cierra */}
                            <View
                                style={[styles.postHeader, { borderBottomColor: colors.border }]}
                                {...postHeaderPan.panHandlers}
                            >
                                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                                <View style={styles.postAuthorRow}>
                                    <View style={[styles.avatarPlaceholder, { marginRight: 12 }]}>
                                        {post.author?.photoUrl
                                            ? <Image source={{ uri: post.author.photoUrl }} style={styles.avatarImage} />
                                            : <Text style={styles.avatarText}>
                                                {post.author?.firstName?.[0] || ''}{post.author?.lastName?.[0] || ''}
                                            </Text>
                                        }
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.postAuthorName, { color: colors.text }]}>
                                            {post.author?.firstName} {post.author?.lastName}
                                        </Text>
                                        <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                                            {formatDate(post.createdAt)}{isEdited ? ' · Editado' : ''}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Contenido del Post — adaptable, con scrollbar visible */}
                            <ScrollView
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={true}
                                bounces={false}
                                contentContainerStyle={{ padding: 16, paddingTop: 10 }}
                                style={{ flexShrink: 1 }}
                            >
                                <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>
                            </ScrollView>

                            {/* Stats + Acciones FIJAS al fondo */}
                            <View style={[styles.postFooterFixed, { borderTopColor: colors.border }]}>
                                {(localCount > 0 || commentsCount > 0) && (
                                    <View style={styles.statsRow}>
                                        {localCount > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Ionicons name="heart" size={15} color="#FF3B30" />
                                                <Text style={[styles.statsText, { color: colors.textSecondary }]}> {localCount}</Text>
                                            </View>
                                        )}
                                        {commentsCount > 0 && (
                                            <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                                                {commentsCount} {commentsCount === 1 ? 'comentario' : 'comentarios'}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                                        <Ionicons name={localLiked ? 'heart' : 'heart-outline'} size={20}
                                            color={localLiked ? '#FF3B30' : colors.textSecondary} />
                                        <Text style={[styles.actionText, { color: localLiked ? '#FF3B30' : colors.textSecondary },
                                            localLiked && { fontWeight: 'bold' }]}>
                                            Me gusta
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>Comentar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ── BURBUJA INFERIOR: Comentarios ── */}
                    <View style={[styles.commentsBubble, { backgroundColor: colors.surface }]}>

                        {/* Cabecera FIJA — arrastrando aquí también cierra */}
                        <View
                            style={[styles.commentsHeader, { borderBottomColor: colors.border }]}
                            {...commentsHeaderPan.panHandlers}
                        >
                            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                            <Text style={[styles.headerTitle, { color: colors.text }]}>Comentarios</Text>
                            <TouchableOpacity onPress={closeWithAnimation} style={styles.closeBtn}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Lista SCROLLABLE */}
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.listContainer}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {loading && !data ? (
                                <View style={styles.center}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            ) : error ? (
                                <View style={styles.center}>
                                    <Text style={{ color: colors.error }}>Error cargando comentarios</Text>
                                    <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 10 }}>
                                        <Text style={{ color: colors.primary }}>Reintentar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (!data?.getCommentsByPost || data.getCommentsByPost.length === 0) ? (
                                <View style={styles.center}>
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        No hay comentarios aún. ¡Sé el primero!
                                    </Text>
                                </View>
                            ) : (
                                data.getCommentsByPost.map((item: any) => renderComment(item))
                            )}
                        </ScrollView>

                        {/* Input FIJO */}
                        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="Escribe un comentario..."
                                placeholderTextColor={colors.textSecondary}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={[styles.sendButton, { opacity: content.trim() ? 1 : 0.5, backgroundColor: colors.primary }]}
                                onPress={handleSend}
                                disabled={!content.trim() || creating}
                            >
                                {creating
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <Ionicons name="send" size={18} color="#FFF" />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    container: {
        // Posicionado absolutamente: top se calcula inline con insets.top + 20
        position: 'absolute',
        left: 8,
        right: 8,
        // top y bottom se inyectan inline desde el componente
        gap: 8,
    },
    // ── Post bubble ──────────────────────────────────────────────────────────
    postBubble: {
        // Adaptable hasta un máximo de 35% de pantalla
        maxHeight: SCREEN_HEIGHT * 0.35,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    postHeader: {
        paddingTop: 14,
        paddingBottom: 10,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    postAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
    },
    postAuthorName: {
        fontWeight: 'bold',
        fontSize: 15,
        marginBottom: 2,
    },
    postDate: { fontSize: 12 },
    postContent: { fontSize: 15, lineHeight: 23 },
    postFooterFixed: {
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    statsText: { fontSize: 13 },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
        paddingVertical: 2,
    },
    actionText: { marginLeft: 6, fontSize: 14, fontWeight: '500' },
    // ── Comments bubble ──────────────────────────────────────────────────────
    commentsBubble: {
        // Toma todo el espacio restante después de la burbuja del post
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    commentsHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        top: 7,
    },
    headerTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
    closeBtn: { position: 'absolute', right: 14, top: 12, zIndex: 10 },
    listContainer: { flexGrow: 1, padding: 14, paddingBottom: 8 },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: { textAlign: 'center', fontSize: 15 },
    // ── Comment item ─────────────────────────────────────────────────────────
    commentCard: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'flex-start',
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 101, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 101, 36, 0.3)',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: '#FF6524', fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' },
    commentContent: { flex: 1, marginRight: 8 },
    commentFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    replyText: { fontSize: 12, fontWeight: 'bold', marginLeft: 12 },
    likeContainer: { alignItems: 'center', paddingHorizontal: 4 },
    authorName: {
        fontWeight: 'bold', fontSize: 13, marginBottom: 2,
        marginTop: Platform.OS === 'android' ? -2 : 0,
    },
    dateText: { fontSize: 12 },
    textContent: { fontSize: 14, lineHeight: 20 },
    // ── Input ────────────────────────────────────────────────────────────────
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        marginRight: 10,
        fontSize: 14,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
