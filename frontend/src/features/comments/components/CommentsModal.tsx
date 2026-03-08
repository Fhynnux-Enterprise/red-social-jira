import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Image, ActivityIndicator, Modal, TouchableWithoutFeedback, Animated, Dimensions, Easing, PanResponder } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { GET_COMMENTS, CREATE_COMMENT } from '../graphql/comments.operations';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PostCard from '../../feed/components/PostCard';

const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
        return `${Math.max(1, diffMins)} min`;
    } else if (diffHours < 24) {
        return `${diffHours} h`;
    } else if (diffDays <= 30) {
        return `Hace ${diffDays} día(s)`;
    } else {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
};

export interface CommentsModalProps {
    visible: boolean;
    post: any | null;
    onClose: () => void;
}

export default function CommentsModal({ visible, post, onClose }: CommentsModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [content, setContent] = useState('');
    const [touchY, setTouchY] = useState(0);
    const postId = post?.id;

    const { height: screenHeight } = Dimensions.get('window');
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [localVisible, setLocalVisible] = useState(visible);

    const inputRef = useRef<TextInput>(null);

    const [isKbVisible, setIsKbVisible] = useState(false);
    const [kbHeight, setKbHeight] = useState(0);

    // Ajuste fino para Android: Si la barra queda un poco cubierta por el teclado o muy alta, cambia este valor.
    // Ejemplos: 30, 45, 60... (Te faltaba ver el 85% de la caja, así que le sumaremos unos 40px por defecto)
    const ANDROID_KEYBOARD_OFFSET = 45;

    useEffect(() => {
        const sub1 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
            setIsKbVisible(true);
            setKbHeight(e.endCoordinates.height);
        });
        const sub2 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
            setIsKbVisible(false);
            setKbHeight(0);
        });
        return () => { sub1.remove(); sub2.remove(); };
    }, []);

    const isCommentsScrolledToTop = useRef(true);
    const isPostScrolledToTop = useRef(true);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10 && isCommentsScrolledToTop.current && Math.abs(gestureState.vy) > Math.abs(gestureState.vx);
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return gestureState.dy > 10 && isCommentsScrolledToTop.current && Math.abs(gestureState.vy) > Math.abs(gestureState.vx);
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // LÍMITE DE CIERRE: Aquí puedes modificar qué porcentaje de la pantalla debe bajar
                // para que se cierre (0.5 = 50% de la pantalla, 0.3 = 30%, etc)
                const SWIPE_CLOSE_THRESHOLD = screenHeight * 0.5;

                // Cerrar solo si bajó más del Límite, o si el arrastre final fue un latigazo fuerte
                if (gestureState.dy > SWIPE_CLOSE_THRESHOLD || gestureState.vy > 2.0) {
                    Animated.parallel([
                        Animated.timing(slideAnim, {
                            toValue: screenHeight,
                            duration: 250,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(fadeAnim, {
                            toValue: 0,
                            duration: 250,
                            useNativeDriver: true,
                        })
                    ]).start(() => {
                        onClose();
                    });
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        bounciness: 6,
                        useNativeDriver: true,
                    }).start();
                }
            }
        })
    ).current;

    useEffect(() => {
        if (visible) {
            setLocalVisible(true);
            slideAnim.setValue(screenHeight);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.poly(3)),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                })
            ]).start(() => {
                // Focus automatizado en el Text Input cuando la animación termina
                setTimeout(() => {
                    inputRef.current?.focus();
                }, 100);
            });
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: screenHeight,
                    duration: 300,
                    easing: Easing.in(Easing.poly(3)),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setLocalVisible(false);
            });
        }
    }, [visible, slideAnim, fadeAnim, screenHeight]);

    const { data, loading, error, refetch } = useQuery(GET_COMMENTS, {
        variables: { postId },
        skip: !postId,
        fetchPolicy: 'cache-and-network',
    });

    const [createComment, { loading: creating }] = useMutation(CREATE_COMMENT, {
        update(cache, { data: { createComment } }) {
            if (!postId) return;
            const existingData = cache.readQuery<{ getCommentsByPost: any[] }>({
                query: GET_COMMENTS,
                variables: { postId },
            });
            if (existingData) {
                cache.writeQuery({
                    query: GET_COMMENTS,
                    variables: { postId },
                    data: {
                        getCommentsByPost: [...existingData.getCommentsByPost, createComment],
                    },
                });
            }
        },
    });

    const handleSend = async () => {
        if (!content.trim() || !postId) return;
        try {
            await createComment({
                variables: { postId, content: content.trim() },
            });
            setContent('');
        } catch (e) {
            console.error("Error creating comment:", e);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const author = item.user;
        const date = new Date(item.createdAt);
        const timeAgo = formatTimeAgo(date);

        return (
            <View style={styles.commentCard}>
                <View style={[styles.avatarPlaceholder]}>
                    {author?.photoUrl ? (
                        <Image source={{ uri: author.photoUrl }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {author?.firstName?.[0] || ''}{author?.lastName?.[0] || ''}
                        </Text>
                    )}
                </View>
                <View style={[styles.commentContent]}>
                    <Text style={[styles.authorName, { color: colors.textSecondary }]}>
                        {author?.firstName} {author?.lastName}
                    </Text>
                    <Text style={[styles.textContent, { color: colors.text }]}>
                        {item.content}
                    </Text>
                    <View style={styles.commentFooter}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            {timeAgo}
                        </Text>
                        <TouchableOpacity>
                            <Text style={[styles.replyText, { color: colors.textSecondary }]}>Responder</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity style={styles.likeContainer}>
                    <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={localVisible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
            hardwareAccelerated={true}
        >
            <View style={{ flex: 1 }} pointerEvents="box-none">

                {/* Capa 1: Burbujas Estáticas (No se mueven con el teclado) */}
                <View style={[StyleSheet.absoluteFillObject]} pointerEvents="box-none">
                    {/* Fondo semitransparente oscuro q responde a toques para cerrar */}
                    <TouchableWithoutFeedback onPress={onClose}>
                        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }} />
                    </TouchableWithoutFeedback>

                    <Animated.View
                        style={{ flex: 1, paddingTop: Math.max(insets.top + 20, 60), transform: [{ translateY: slideAnim }] }}
                        pointerEvents="box-none"
                        {...panResponder.panHandlers}
                    >

                        {/* Globo Arriba: Publicación (max 40%) */}
                        {post && (
                            <View style={[styles.postBubble, { backgroundColor: colors.surface }]}>
                                <PostCard
                                    item={post}
                                    onOptionsPress={() => { }}
                                    isModalView={true}
                                    headerPanHandlers={panResponder.panHandlers}
                                    onScroll={(e) => {
                                        isPostScrolledToTop.current = e.nativeEvent.contentOffset.y <= 30;
                                    }}
                                />
                            </View>
                        )}

                        {/* Globo Abajo: Comentarios */}
                        <View style={[styles.commentsBubble, { backgroundColor: colors.surface, marginBottom: isKbVisible ? 300 : Math.max(insets.bottom + 65, 80) }]}>
                            {/* Barra Superior de la Burbuja */}
                            <View style={[styles.commentsHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                                <Text style={[styles.headerTitle, { color: colors.text }]} pointerEvents="none">Comentarios</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeModalButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1 }}>
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
                                ) : (
                                    <FlatList
                                        data={data?.getCommentsByPost || []}
                                        keyExtractor={(item) => item.id}
                                        renderItem={renderItem}
                                        onScroll={(e) => {
                                            isCommentsScrolledToTop.current = e.nativeEvent.contentOffset.y <= 30;
                                        }}
                                        onMomentumScrollEnd={(e) => {
                                            isCommentsScrolledToTop.current = e.nativeEvent.contentOffset.y <= 30;
                                        }}
                                        scrollEventThrottle={16}
                                        bounces={false}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={styles.listContainer}
                                        ListEmptyComponent={
                                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                                No hay comentarios aún. ¡Sé el primero!
                                            </Text>
                                        }
                                    />
                                )}
                            </View>
                        </View>
                    </Animated.View>
                </View>

                {/* Capa 2: Input Dinámico (Aislado, sube exactamente con el teclado usando el motor nativo de Android/iOS) */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    pointerEvents="box-none"
                    keyboardVerticalOffset={0}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
                        <Animated.View style={{ transform: [{ translateY: slideAnim }], marginBottom: Platform.OS === 'android' && isKbVisible ? kbHeight + ANDROID_KEYBOARD_OFFSET : 0 }}>
                            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: isKbVisible ? 10 : Math.max(insets.bottom, 15) }]}>
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
                                    disabled={!content.trim() || creating}
                                >
                                    {creating ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Ionicons name="send" size={18} color="#FFF" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    postBubble: {
        maxHeight: '40%',
        marginHorizontal: 6,
        marginBottom: 4,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    commentsBubble: {
        flex: 1,
        marginHorizontal: 6,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    commentsHeader: {
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        justifyContent: 'center',
    },
    closeModalButton: {
        position: 'absolute',
        right: 16,
        top: 14,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    commentCard: {
        flexDirection: 'row',
        marginBottom: 16,
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
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        color: '#FF6524',
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
    },
    commentContent: {
        flex: 1,
        marginRight: 10,
    },
    commentFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    replyText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    likeContainer: {
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    authorName: {
        fontWeight: 'bold',
        fontSize: 13,
        marginBottom: 2,
        marginTop: Platform.OS === 'android' ? -2 : 0,
    },
    dateText: {
        fontSize: 12,
    },
    textContent: {
        fontSize: 14,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
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
