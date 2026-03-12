import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, Platform, StyleSheet,
    Image, ActivityIndicator, TouchableWithoutFeedback,
    Alert, Pressable, Keyboard, ScrollView, Modal,
    Dimensions, TextInput, PanResponder, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { GET_COMMENTS, CREATE_COMMENT, DELETE_COMMENT, UPDATE_COMMENT } from '../graphql/comments.operations';
import { TOGGLE_LIKE } from '../../feed/graphql/posts.operations';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/context/AuthContext';
import CommentOptionsModal from './CommentOptionsModal';
import ConfirmationModal from './ConfirmationModal';

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
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year} a las ${timeString}`;
};

export interface CommentsModalProps {
    visible: boolean;
    post: any | null;
    onClose: () => void;
}

export default function CommentsModal({ visible, post, onClose }: CommentsModalProps) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
    const navigation = useNavigation();
    const [content, setContent] = useState('');
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const postId = post?.id;

    const navigateToProfile = (userId: string) => {
        onClose();
        setTimeout(() => (navigation.navigate as any)('Profile', { userId }), 320);
    };

    // ── Animación entrada/salida + drag ────────────────────────────────────
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

    useEffect(() => {
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

    // ── Teclado ────────────────────────────────────────────────────────────
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
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // ── PanResponder: arrastra headers para cerrar ─────────────────────────
    const makeDragPan = () => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && g.dy > 0,
        onPanResponderMove: (_, g) => { if (g.dy > 0) panY.setValue(g.dy); },
        onPanResponderRelease: (_, g) => {
            const shouldClose = g.dy > SCREEN_HEIGHT * 0.45 || g.vy > 1.2;
            if (shouldClose) {
                closeWithAnimation();
            } else {
                Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            }
        },
    });

    const postHeaderPan = useRef(makeDragPan()).current;
    const commentsHeaderPan = useRef(makeDragPan()).current;

    // ── PanResponder: espacio vacío dentro del ScrollView ─────────────────
    // onStartShouldSetPanResponder:true → reclama el gesto ANTES que el ScrollView
    const emptyAreaPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => { if (g.dy > 0) panY.setValue(g.dy); },
        onPanResponderRelease: (_, g) => {
            const shouldClose = g.dy > SCREEN_HEIGHT * 0.45 || g.vy > 1.2;
            if (shouldClose) {
                closeWithAnimation();
            } else {
                Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            }
        },
        onPanResponderTerminate: () => {
            Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        },
    })).current;

    // ── Scroll pull-to-close refs ──────────────────────────────────────────
    const scrollDragStartY = useRef(0);
    const postScrollDragStartY = useRef(0);

    // ── Likes ──────────────────────────────────────────────────────────────
    const displayLiked = post?.likes?.some((l: any) => l.user?.id === currentUser?.id) || false;
    const [localLiked, setLocalLiked] = useState(displayLiked);
    const [localCount, setLocalCount] = useState<number>(post?.likes?.length || 0);
    const [toggleLikeMutation] = useMutation(TOGGLE_LIKE);

    useEffect(() => {
        setLocalLiked(post?.likes?.some((l: any) => l.user?.id === currentUser?.id) || false);
        setLocalCount(post?.likes?.length || 0);
    }, [post?.likes]);

    const handleLike = () => {
        if (!currentUser?.id || !postId) return;
        const next = !localLiked;
        setLocalLiked(next);
        setLocalCount((c) => next ? c + 1 : Math.max(0, c - 1));

        let optimisticLikes = [...(post?.likes || [])];
        if (localLiked) {
            optimisticLikes = optimisticLikes.filter((l: any) => l.user?.id !== currentUser.id);
        } else {
            optimisticLikes.push({ __typename: 'PostLike', id: `temp-${Date.now()}`, user: { __typename: 'User', id: currentUser.id } });
        }

        toggleLikeMutation({
            variables: { postId },
            optimisticResponse: {
                toggleLike: {
                    __typename: 'Post',
                    id: postId,
                    likes: optimisticLikes,
                    comments: post?.comments || [],
                },
            },
        }).catch(() => {
            setLocalLiked(!next);
            setLocalCount((c) => !next ? c + 1 : Math.max(0, c - 1));
        });
    };

    // ── Comments query ─────────────────────────────────────────────────────
    const { data, loading, error, refetch } = useQuery(GET_COMMENTS, {
        variables: { postId },
        skip: !postId,
        fetchPolicy: 'cache-and-network',
    });

    const commentsCount = data?.getCommentsByPost?.length ?? post?.comments?.length ?? 0;

    const [createComment, { loading: creating }] = useMutation(CREATE_COMMENT, {
        update(cache, { data: { createComment: newComment } }) {
            if (!postId) return;
            const existing = cache.readQuery<{ getCommentsByPost: any[] }>({
                query: GET_COMMENTS, variables: { postId },
            });
            if (existing) {
                // Evitamos duplicados si el optimisticResponse ya escribió en el cache
                const isDuplicate = existing.getCommentsByPost.some((c: any) => c.id === newComment.id);
                if (!isDuplicate) {
                    cache.writeQuery({
                        query: GET_COMMENTS, variables: { postId },
                        data: { getCommentsByPost: [newComment, ...existing.getCommentsByPost] },
                    });
                }
            }

            // Actualizamos la lista de comentarios del POST para que el conteo se vea en todo el app
            cache.modify({
                id: cache.identify({ __typename: 'Post', id: postId }),
                fields: {
                    comments(existingComments = []) {
                        // Evitar duplicados si ya se agregó
                        if (existingComments.some((c: any) => c.__ref === cache.identify(newComment) || c.id === newComment.id)) {
                            return existingComments;
                        }
                        return [newComment, ...existingComments];
                    }
                }
            });
        },
    });

    const [deleteComment] = useMutation(DELETE_COMMENT, {
        update(cache, { data: { deleteComment: success } }, { variables }) {
            if (!success || !postId) return;
            const commentId = variables?.id;

            // 1. Quitar de la lista de comentarios
            const existing = cache.readQuery<{ getCommentsByPost: any[] }>({
                query: GET_COMMENTS, variables: { postId },
            });
            if (existing) {
                cache.writeQuery({
                    query: GET_COMMENTS, variables: { postId },
                    data: { getCommentsByPost: existing.getCommentsByPost.filter(c => c.id !== commentId) },
                });
            }

            // 2. Actualizar el Post para que baje el contador
            cache.modify({
                id: cache.identify({ __typename: 'Post', id: postId }),
                fields: {
                    comments(existingRefs = [], { readField }) {
                        return existingRefs.filter((ref: any) => readField('id', ref) !== commentId);
                    }
                }
            });
        }
    });

    const handleDeleteComment = (id: string) => {
        setSelectedCommentId(id);
        setIsDeleteConfirmVisible(true);
    };

    const onConfirmDelete = async () => {
        if (!selectedCommentId) return;
        try {
            setIsDeleteConfirmVisible(false);
            await deleteComment({ variables: { id: selectedCommentId } });
        } catch (e) {
            console.error('Error al eliminar comentario:', e);
            Alert.alert('Error', 'No se pudo eliminar el comentario');
        }
    };

    const [updateComment, { loading: updating }] = useMutation(UPDATE_COMMENT);

    const handleCancelEdit = () => {
        setContent('');
        setEditingCommentId(null);
        Keyboard.dismiss();
    };

    const handleSend = async () => {
        if (!content.trim() || !postId || !currentUser) return;
        try {
            const commentText = content.trim();
            
            if (editingCommentId) {
                // Buscamos el comentario original para mantener su createdAt en el optimisticResponse
                const originalComment = data?.getCommentsByPost?.find((c: any) => c.id === editingCommentId);
                
                await updateComment({
                    variables: { id: editingCommentId, content: commentText },
                    optimisticResponse: {
                        updateComment: {
                            __typename: 'Comment',
                            id: editingCommentId,
                            content: commentText,
                            createdAt: originalComment?.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        }
                    },
                    update(cache, { data: { updateComment: updated } }) {
                        if (!updated || !postId) return;
                        
                        // Forzamos la actualización de la lista de comentarios en el cache
                        const existing = cache.readQuery<{ getCommentsByPost: any[] }>({
                            query: GET_COMMENTS,
                            variables: { postId }
                        });

                        if (existing) {
                            const newComments = existing.getCommentsByPost.map(c => 
                                c.id === updated.id ? { ...c, content: updated.content } : c
                            );
                            cache.writeQuery({
                                query: GET_COMMENTS,
                                variables: { postId },
                                data: { getCommentsByPost: newComments }
                            });
                        }
                    }
                });
            } else {
                await createComment({
                    variables: { postId, content: commentText },
                    optimisticResponse: {
                        createComment: {
                            __typename: 'Comment',
                            id: `temp-${Date.now()}`,
                            content: commentText,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            user: {
                                __typename: 'User',
                                id: currentUser.id,
                                username: currentUser.username || '',
                                firstName: currentUser.firstName,
                                lastName: currentUser.lastName,
                                photoUrl: currentUser.photoUrl || null,
                            },
                        },
                    },
                });
            }
            
            setContent('');
            setEditingCommentId(null);
            Keyboard.dismiss();
        } catch (e) {
            console.error(e);
        }
    };


    // ── Render comentario ──────────────────────────────────────────────────
    const renderComment = (item: any) => {
        const author = item.user;
        const isMyComment = author?.id === currentUser?.id;
        const handleLongPress = () => {
            if (isMyComment) {
                setSelectedCommentId(item.id);
                setIsOptionsModalVisible(true);
            }
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
                    <TouchableOpacity
                        onPress={() => author?.id && navigateToProfile(author.id)}
                        activeOpacity={0.7}
                        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                    >
                        {author?.photoUrl
                            ? <Image source={{ uri: author.photoUrl }} style={styles.avatarImage} />
                            : <Text style={styles.avatarText}>{author?.firstName?.[0] || ''}{author?.lastName?.[0] || ''}</Text>
                        }
                    </TouchableOpacity>
                </View>
                <View style={styles.commentContent}>
                    <TouchableOpacity onPress={() => author?.id && navigateToProfile(author.id)} activeOpacity={0.7}>
                        <Text style={[styles.authorName, { color: colors.textSecondary }]}>
                            {author?.firstName} {author?.lastName}
                        </Text>
                    </TouchableOpacity>
                    <Text style={[styles.textContent, { color: colors.text }]}>{item.content}</Text>
                    <View style={styles.commentFooter}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            {formatTimeAgo(new Date(item.createdAt))}
                            {(() => {
                                if (!item.createdAt || !item.updatedAt) return null;
                                const created = new Date(item.createdAt).getTime();
                                const updated = new Date(item.updatedAt).getTime();
                                if (isNaN(created) || isNaN(updated)) return null;
                                const isEdited = updated - created > 2000;
                                return isEdited ? <Text style={{ fontStyle: 'italic' }}> • Editado</Text> : null;
                            })()}
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

    const isEdited = post?.updatedAt &&
        new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 2000;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeWithAnimation} statusBarTranslucent>

            <TouchableWithoutFeedback onPress={closeWithAnimation}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            {/* Exterior: mueve bottom con el teclado (JS driver) */}
            <Animated.View
                style={[styles.container, { top: insets.top + 20, bottom: keyboardOffset }]}
                pointerEvents="box-none"
            >
                {/* Interior: drag translateY (native driver) */}
                <Animated.View style={[{ flex: 1, gap: 8 }, { transform: [{ translateY: panY }] }]}>

                    {/* ── BURBUJA PUBLICACIÓN ── */}
                    {post && (
                        <View style={styles.postBubble}>
                            <View style={[styles.postHeader, { borderBottomColor: colors.border }]} {...postHeaderPan.panHandlers}>
                                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                                <TouchableOpacity
                                    style={styles.postAuthorRow}
                                    onPress={() => post.author?.id && navigateToProfile(post.author.id)}
                                    activeOpacity={0.7}
                                >
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
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={true}
                                persistentScrollbar={true}
                                indicatorStyle={isDark ? 'white' : 'black'}
                                nestedScrollEnabled={true}
                                bounces={true}
                                contentContainerStyle={styles.postScrollContent}
                                style={styles.postScrollView}
                                scrollEventThrottle={8}
                                onScrollBeginDrag={(e) => {
                                    postScrollDragStartY.current = e.nativeEvent.contentOffset.y;
                                }}
                                onScrollEndDrag={(e) => {
                                    const endY = e.nativeEvent.contentOffset.y;
                                    const vy = e.nativeEvent.velocity?.y ?? 0;
                                    if (postScrollDragStartY.current <= 2 && endY <= 2 && vy > 0.3) {
                                        closeWithAnimation();
                                    } else {
                                        Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
                                    }
                                }}
                            >
                                <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>
                            </ScrollView>

                            <View style={[styles.postFooterFixed, { borderTopColor: colors.border }]}>
                                {(localCount > 0 || commentsCount > 0) && (
                                    <View style={styles.statsRow}>
                                        {/* Comentarios a la izquierda */}
                                        <View>
                                            {commentsCount > 0 && (
                                                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                                                    {commentsCount} {commentsCount === 1 ? 'comentario' : 'comentarios'}
                                                </Text>
                                            )}
                                        </View>

                                        {/* Likes a la derecha */}
                                        <View>
                                            {localCount > 0 && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="heart" size={15} color="#FF3B30" />
                                                    <Text style={[styles.statsText, { color: colors.textSecondary }]}> {localCount}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                )}
                                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                                        <Ionicons name={localLiked ? 'heart' : 'heart-outline'} size={20}
                                            color={localLiked ? '#FF3B30' : colors.textSecondary} />
                                        <Text style={[styles.actionText, { color: localLiked ? '#FF3B30' : colors.textSecondary },
                                        localLiked && { fontWeight: 'bold' }]}>Me gusta</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>Comentar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ── BURBUJA COMENTARIOS ── */}
                    <View style={[styles.commentsBubble, { backgroundColor: colors.surface }]}>

                        <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]} {...commentsHeaderPan.panHandlers}>
                            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                            <Text style={[styles.headerTitle, { color: colors.text }]}>Comentarios</Text>
                            <TouchableOpacity onPress={closeWithAnimation} style={styles.closeBtn}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.listContainer}
                            showsVerticalScrollIndicator={false}
                            bounces={true}
                            keyboardShouldPersistTaps="handled"
                            scrollEventThrottle={8}
                            onScrollBeginDrag={(e) => {
                                scrollDragStartY.current = e.nativeEvent.contentOffset.y;
                            }}
                            onScrollEndDrag={(e) => {
                                const endY = e.nativeEvent.contentOffset.y;
                                const vy = e.nativeEvent.velocity?.y ?? 0;
                                if (scrollDragStartY.current <= 2 && endY <= 2 && vy > 0.3) {
                                    closeWithAnimation();
                                } else {
                                    Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
                                }
                            }}
                        >
                            {loading && !data ? (
                                <View style={[styles.center, { flex: 1 }]} {...emptyAreaPan.panHandlers}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            ) : error ? (
                                <View style={[styles.center, { flex: 1 }]} {...emptyAreaPan.panHandlers}>
                                    <Text style={{ color: colors.error }}>Error cargando comentarios</Text>
                                    <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 10 }}>
                                        <Text style={{ color: colors.primary }}>Reintentar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (!data?.getCommentsByPost || data.getCommentsByPost.length === 0) ? (
                                <View style={[styles.center, { flex: 1 }]} {...emptyAreaPan.panHandlers}>
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        No hay comentarios aún. ¡Sé el primero!
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {[...(data?.getCommentsByPost || [])]
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((item: any) => renderComment(item))}
                                    {/* Zona arrastrable en espacio vacío bajo los últimos comentarios */}
                                    <View style={{ flex: 1, minHeight: 80 }} {...emptyAreaPan.panHandlers} />
                                </>
                            )}
                        </ScrollView>

                        {editingCommentId && (
                            <View style={[styles.editingBar, { borderTopColor: colors.border }]}>
                                <Text style={[styles.editingText, { color: colors.textSecondary }]}>
                                    Editando comentario...
                                </Text>
                                <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                                    <Text style={[styles.cancelEditText, { color: colors.primary }]}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
                            <TextInput
                                ref={inputRef}
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
                                disabled={!content.trim() || creating || updating}
                            >
                                {creating || updating
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <Ionicons name={editingCommentId ? "checkmark" : "send"} size={editingCommentId ? 22 : 18} color="#FFF" />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>

            <CommentOptionsModal
                visible={isOptionsModalVisible}
                commentId={selectedCommentId}
                onClose={() => setIsOptionsModalVisible(false)}
                onEdit={(id) => {
                    const commentToEdit = data?.getCommentsByPost?.find((c: any) => c.id === id);
                    if (commentToEdit) {
                        setContent(commentToEdit.content);
                        setEditingCommentId(id);
                        setIsOptionsModalVisible(false);
                        // Aumentamos el tiempo a 400ms para asegurar que el modal anterior se cierre 
                        // y el sistema permita abrir el teclado correctamente.
                        setTimeout(() => inputRef.current?.focus(), 400);
                    }
                }}
                onDelete={handleDeleteComment}
            />

            <ConfirmationModal
                visible={isDeleteConfirmVisible}
                title="Eliminar comentario"
                message="¿Estás seguro de que quieres eliminar este comentario? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                onConfirm={onConfirmDelete}
                onCancel={() => setIsDeleteConfirmVisible(false)}
            />
        </Modal>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    container: {
        position: 'absolute',
        left: 8,
        right: 8,
    },
    postBubble: {
        maxHeight: SCREEN_HEIGHT * 0.35,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        // Fondo gris un poco más oscuro en light mode para resaltar el scrollbar
        backgroundColor: isDark ? colors.surface : '#EBEBEB',
    },
    postScrollView: {
        flexShrink: 1,
        // Un borde sutil a la derecha que simula el rail del scroll
        borderRightWidth: 1.5,
        borderRightColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    postScrollContent: { 
        paddingLeft: 16, 
        paddingRight: 12, 
        paddingTop: 10, 
        paddingBottom: 16 
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
    postAuthorName: { fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
    postDate: { fontSize: 12 },
    postContent: { fontSize: 15, lineHeight: 23 },
    postFooterFixed: { borderTopWidth: StyleSheet.hairlineWidth },
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
    actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24, paddingVertical: 2 },
    actionText: { marginLeft: 6, fontSize: 14, fontWeight: '500' },
    commentsBubble: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        backgroundColor: colors.surface,
    },
    commentsHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        top: 7,
        backgroundColor: colors.border,
    },
    headerTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 4, color: colors.text },
    closeBtn: { position: 'absolute', right: 14, top: 12, zIndex: 10 },
    listContainer: { flexGrow: 1, padding: 14, paddingBottom: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    emptyText: { textAlign: 'center', fontSize: 15, color: colors.textSecondary },
    commentCard: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
    avatarPlaceholder: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255, 101, 36, 0.15)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 10,
        borderWidth: 1, borderColor: 'rgba(255, 101, 36, 0.3)',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: '#FF6524', fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' },
    commentContent: { flex: 1, marginRight: 8 },
    commentFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    replyText: { fontSize: 12, fontWeight: 'bold', marginLeft: 12 },
    likeContainer: { alignItems: 'center', paddingHorizontal: 4 },
    authorName: { fontWeight: 'bold', fontSize: 13, marginBottom: 2, marginTop: Platform.OS === 'android' ? -2 : 0 },
    dateText: { fontSize: 12 },
    textContent: { fontSize: 14, lineHeight: 20 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        backgroundColor: colors.surface,
    },
    input: {
        flex: 1, minHeight: 40, maxHeight: 100,
        borderWidth: 1, borderRadius: 20,
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
        marginRight: 10, fontSize: 14,
        backgroundColor: colors.background,
        color: colors.text,
        borderColor: colors.border,
    },
    sendButton: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
    },
    editingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    editingText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    cancelEditBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    cancelEditText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
});
