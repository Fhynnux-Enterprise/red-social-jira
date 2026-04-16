import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, Platform, StyleSheet,
    Image, ActivityIndicator, TouchableWithoutFeedback,
    Alert, Pressable, Keyboard, ScrollView, Modal,
    Dimensions, TextInput, PanResponder, Animated,
    LayoutAnimation, BackHandler
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { GET_COMMENTS, CREATE_COMMENT, DELETE_COMMENT, UPDATE_COMMENT } from '../graphql/comments.operations';
import { TOGGLE_LIKE } from '../../feed/graphql/posts.operations';
import { 
    TOGGLE_STORE_PRODUCT_LIKE, 
    CREATE_STORE_PRODUCT_COMMENT, 
    GET_STORE_PRODUCT_COMMENTS, 
    DELETE_STORE_PRODUCT_COMMENT 
} from '../../store/graphql/store.operations';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/context/AuthContext';
import CommentOptionsModal from './CommentOptionsModal';
import ConfirmationModal from './ConfirmationModal';
import CommentItem from './CommentItem';
import CopyTextModal from '../../../components/CopyTextModal';
import ReportModal from '../../reports/components/ReportModal';
import ImageCarousel from '../../feed/components/ImageCarousel';
import JobOfferCard from '../../jobs/components/JobOfferCard';
import ProfessionalCard from '../../jobs/components/ProfessionalCard';
import StoreProductCard from '../../store/components/StoreProductCard';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
    initialMinimized?: boolean;
    initialTab?: 'comments' | 'likes';
    onNextPost?: () => void;
    onPrevPost?: () => void;
    nextPost?: any | null;
    prevPost?: any | null;
    hasMorePosts?: boolean;
    onOptionsPress?: (post: any) => void;
    initialExpanded?: boolean;
}
export default function CommentsModal({
    visible, post, onClose,
    initialMinimized = false, initialTab = 'comments',
    onNextPost, onPrevPost, nextPost, prevPost, hasMorePosts = false,
    onOptionsPress, initialExpanded = false
}: CommentsModalProps) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
    const navigation = useNavigation();
    const apolloClient = useApolloClient();
    const [content, setContent] = useState('');
    const [selectedCommentData, setSelectedCommentData] = useState<{ id: string, isMine: boolean, isReply: boolean } | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'likes'>(initialTab);
    const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [postReportVisible, setPostReportVisible] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    // postScrollEnabled: state para re-renderizar el ScrollView, ref para el PanResponder (closure-safe)
    const [postScrollEnabled, setPostScrollEnabled] = React.useState(true);
    const postScrollEnabledRef = useRef(true);
    const setScrollEnabled = (val: boolean) => {
        postScrollEnabledRef.current = val;
        setPostScrollEnabled(val);
    };
    // Rastrea si el usuario ya hizo scroll hacia abajo en el post actual.
    // La captura TikTok en el TOPE solo se activa si antes exploró el contenido hacia abajo.
    const hasScrolledDown = useRef(false);
    const postId = post?.id;
    // El item puede ser un Post, JobOffer o ProfessionalProfile
    const isPost = !post?.__typename || post.__typename === 'Post';
    const isStore = post?.__typename === 'StoreProduct';
    const isCommentable = isPost || isStore;
    const effectiveIsMinimized = isMinimized || !isCommentable;
    // Para todos los tipos de publicación, remap los aliases de Apollo al campo 'media' estándar
    const normalizedItem = React.useMemo(() => {
        if (!post) return post;
        if (post.__typename === 'JobOffer') {
            return { ...post, title: post.jobTitle ?? post.title, media: post.jobMedia ?? post.media ?? [] };
        }
        if (post.__typename === 'ProfessionalProfile') {
            return { ...post, media: post.profMedia ?? post.media ?? [] };
        }
        if (post.__typename === 'StoreProduct') {
            return {
                ...post,
                title: post.storeTitle ?? post.title,
                media: post.storeMedia ?? post.media ?? [],
                location: post.storeLocation,
                contactPhone: post.storeContactPhone,
            };
        }
        // Post: remap postMedia alias
        return { ...post, media: post.postMedia ?? post.media ?? [] };
    }, [post]);

    // Resetear scroll al cambiar de post
    useEffect(() => {
        if (scrollViewRef.current && postId) {
            scrollViewRef.current.scrollTo({ y: 0, animated: false });
            currentScrollY.current = 0;
        }
        // Reset: el usuario aún no exploró este post hacia abajo
        hasScrolledDown.current = false;
        // Iniciar con scroll desactivado para que el primer toque en y=0
        // sea capturado por tiktokSwipePan (prev post desde el primer drag).
        setScrollEnabled(false);
    }, [postId]);

    // Lógica para determinar si el texto es largo
    const TEXT_LIMIT = 90;
    const isTextLong = (post?.content?.length || 0) > TEXT_LIMIT;
    const displayContent = isTextLong && !isExpanded
        ? post?.content.substring(0, TEXT_LIMIT).trimEnd()
        : post?.content;

    // =======================================================================================
    // 🎛️ CONTROLES DE PANTALLA AJUSTABLES PARA EL TAMAÑO DE LA COMPOSICIÓN (MODIFICA AQUÍ)
    // =======================================================================================

    // 1. ESPACIO DESDE ARRIBA (Haz esto más pequeño para que la publicación suba)
    // 0 es el límite absoluto de la zona segura (la cámara o barra de estado de tu celular).
    // Ponlo en 0, 2 o 4 para aprovechar pantalla hacia arriba.
    const TOP_SPACING = -12;

    // 2. ESPACIO CON LA BARRA INFERIOR (Haz esto más pequeño para que baje MAS la tarjeta)
    // Este valor restringe la tarjeta minimizada para que no se encima con tu barra negra.
    // Bájalo a 45 o 40 si quieres que llegue rozando, o súbelo si la tapa.
    const BOTTOM_SPACING = 40;

    // 2. TAMAÑO CUANDO EL CAJÓN DE COMENTARIOS ESTÁ ABIERTO
    // Puedes ajustar este multiplicador (p. ej 0.45) para que el post no se acorte tanto al leer comentarios.
    const POST_EXPANDED_MAX_HEIGHT = SCREEN_HEIGHT * 0.35;
    // =======================================================================================

    const navigateToProfile = (userId: string) => {
        onClose();
        setTimeout(() => (navigation.navigate as any)('Profile', { userId }), 320);
    };

    // Almacenamos los callbacks actualizados en una referencia porque el PanResponder guarda las variables del primer render
    const callbacksRef = useRef({ onNextPost, onPrevPost, hasMorePosts });
    // IGUAL para nextPost/prevPost: el PanResponder los lee desde la ref, no del closure inicial
    const navRef = useRef({ nextPost, prevPost });
    useEffect(() => {
        callbacksRef.current = { onNextPost, onPrevPost, hasMorePosts };
        navRef.current = { nextPost, prevPost };
    }, [onNextPost, onPrevPost, nextPost, prevPost, hasMorePosts]);

    const toggleMinimize = () => {
        // Para no-Posts (Ofertas/Servicios) temporalmente bloqueamos, excepto Store
        if (!isCommentable) return;
        if (!isMinimized) {
            Keyboard.dismiss();
        }
        if (bubbleAnimReady.current) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        }
        setIsMinimized(!isMinimized);
    };

    // Flag: solo habilita LayoutAnimation tras la animación de entrada del modal
    const bubbleAnimReady = useRef(false);

    // ── Animación entrada/salida + drag del modal entero ─────────────────
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const currentGestureAxis = useRef<'none' | 'vertical' | 'horizontal'>('none');

    // ── Animación para el cambio de post estilo TikTok (Físico) ──────────
    const panYPost = useRef(new Animated.Value(0)).current;
    const panX = useRef(new Animated.Value(0)).current;

    // ── PanResponder para el fondo transparente (cierre + TikTok vertical) ──
    const backgroundSwipePan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
            (Math.abs(g.dx) > Math.abs(g.dy) && g.dx < 0) ||
            (Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 8),
        onPanResponderGrant: () => {
            // El backdrop siempre puede hacer TikTok — el postScrollEnabled no aplica aquí
            // (el backdrop está FUERA del postBubble/ScrollView)
            currentGestureAxis.current = 'none'; // Reset axis on grant
        },
        onPanResponderMove: (_, g) => {
            if (currentGestureAxis.current === 'none') {
                if (Math.abs(g.dy) > 12) currentGestureAxis.current = 'vertical';
                else if (g.dx < -25) currentGestureAxis.current = 'horizontal';
            }

            if (currentGestureAxis.current === 'vertical') {
                panYPost.setValue(g.dy);
            } else if (currentGestureAxis.current === 'horizontal') {
                panX.setValue(g.dx);
            }
        },
        onPanResponderRelease: (_, g) => {
            const currentAxis = currentGestureAxis.current;
            currentGestureAxis.current = 'none';
            setScrollEnabled(true); // Siempre limpiar estado al soltar desde el backdrop
            const isTap = Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10;
            if (isTap) {
                closeWithAnimation();
                return;
            }

            if (currentAxis === 'horizontal' && (g.dx < -80 || (g.vx < -0.8 && g.dx < -20))) {
                closeWithXAnimation();
            } else if (currentAxis === 'vertical') {
                const THRESHOLD = SCREEN_HEIGHT * 0.2;
                if (g.dy < -THRESHOLD || g.vy < -0.7) {
                    if (navRef.current.nextPost) {
                        Animated.timing(panYPost, {
                            toValue: -SCREEN_HEIGHT, duration: 280, useNativeDriver: true,
                        }).start(() => { lastSwipeDir.current = 'up'; callbacksRef.current.onNextPost?.(); });
                    } else {
                        // Última publicación -> cerrar modal
                        Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                    }
                } else if (g.dy > THRESHOLD || g.vy > 0.7) {
                    if (navRef.current.prevPost) {
                        Animated.timing(panYPost, {
                            toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true,
                        }).start(() => { lastSwipeDir.current = 'down'; callbacksRef.current.onPrevPost?.(); });
                    } else {
                        // Primera publicación -> cerrar modal
                        Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                    }
                } else {
                    Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
                }
            } else {
                Animated.spring(panX, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
            }
        }
    })).current;

    const currentScrollY = useRef(0);

    // ── PanResponder TikTok: sigue el dedo en el postBubble ──────────────
    // Este PanResponder puede capturar el gesto solo cuando scrollEnabled=false,
    // ya que el ScrollView soltó el control del toque.
    const tiktokSwipePan = useRef(PanResponder.create({
        // Caso A: siguiente toque después de llegar al borde (scrollEnabled ya desactivado)
        onStartShouldSetPanResponderCapture: () => !postScrollEnabledRef.current,
        // Caso B: captura mid-gesture detectando la posición del scroll mientras arrastra
        // Esto permite robar el gesto al ScrollView cuando llega al borde sin soltar el dedo
        onMoveShouldSetPanResponderCapture: (_, g) => {
            if (!(Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx))) return false;
            if (!postScrollEnabledRef.current) return true;
            // En el tope, si arrastra abajo (g.dy > 0) -> quiere el post anterior
            const atTop = currentScrollY.current <= 5 && g.dy > 0;
            // Captura al fondo arrastrando arriba (g.dy < 0) -> post siguiente
            const atBottom =
                currentScrollY.current + postScrollHeight.current >= postScrollContentHeight.current - 5
                && g.dy < 0;
            return atTop || atBottom;
        },
        onPanResponderMove: (_, g) => {
            // Solo mover el bubble si el gesto va en la dirección correcta para la posición actual
            const reallyAtBottom =
                currentScrollY.current + postScrollHeight.current >= postScrollContentHeight.current - 5;
            const reallyAtTop = currentScrollY.current <= 5;
            if ((reallyAtBottom && g.dy < 0) || (reallyAtTop && g.dy > 0)) {
                panYPost.setValue(g.dy);
            }
            // Si la dirección no coincide, no movemos nada (el release lo reseteará)
        },
        onPanResponderRelease: (_, g) => {
            const THRESHOLD = SCREEN_HEIGHT * 0.2;
            const actuallyAtBottom =
                currentScrollY.current + postScrollHeight.current >= postScrollContentHeight.current - 5;
            const actuallyAtTop = currentScrollY.current <= 5;

            if (g.dy < -THRESHOLD || g.vy < -0.7) {
                // Gesto HACIA ARRIBA (dedo sube) → siguiente post SOLO si realmente está al fondo
                if (actuallyAtBottom) {
                    if (navRef.current.nextPost) {
                        Animated.timing(panYPost, {
                            toValue: -SCREEN_HEIGHT, duration: 280, useNativeDriver: true,
                        }).start(() => { lastSwipeDir.current = 'up'; callbacksRef.current.onNextPost?.(); });
                    } else if (callbacksRef.current.hasMorePosts) {
                        // Si hay más posts pero aún no se cargan, rebotamos pero avisamos al padre para que cargue
                        Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                        callbacksRef.current.onNextPost?.();
                    } else {
                        // Última publicación y no hay más en la DB: rebote normal
                        Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                    }
                } else {
                    // El usuario intentaba scrollear hacia abajo, no cambiar de post
                    setScrollEnabled(true);
                    hasScrolledDown.current = false;
                    Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                }
            } else if (g.dy > THRESHOLD || g.vy > 0.7) {
                // Gesto HACIA ABAJO (dedo baja) → post anterior SOLO si realmente está en el tope
                if (actuallyAtTop) {
                    if (navRef.current.prevPost) {
                        Animated.timing(panYPost, {
                            toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true,
                        }).start(() => { lastSwipeDir.current = 'down'; callbacksRef.current.onPrevPost?.(); });
                    } else {
                        // Primera publicación: rebote
                        Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                    }
                } else {
                    // El usuario intentaba scrollear hacia arriba, no cambiar de post
                    setScrollEnabled(true);
                    hasScrolledDown.current = false;
                    Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                }
            } else {
                // Por debajo del umbral → rebote + rehabilitar scroll para uso normal
                setScrollEnabled(true);
                hasScrolledDown.current = false;
                Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
            }
        },
        onPanResponderTerminate: () => {
            setScrollEnabled(true);
            Animated.spring(panYPost, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderEnd: () => {
            setScrollEnabled(true);
        },
    })).current;


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

    const closeWithXAnimation = () => {
        Animated.timing(panX, {
            toValue: -SCREEN_WIDTH,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    // ── Animación cambio de publicación ────────────────────────────────────
    const postTransition = useRef(new Animated.Value(1)).current;
    const lastSwipeDir = useRef<'up' | 'down'>('up');
    const prevPostId = useRef(post?.id);

    useEffect(() => {
        if (visible && post?.id && prevPostId.current !== post.id) {
            // Determinar desde dónde entra el nuevo post (opuesto a la dirección del swipe)
            // swipe 'up' (siguiente) → nuevo post viene de abajo (+SCREEN_HEIGHT)
            // swipe 'down' (anterior) → nuevo post viene de arriba (-SCREEN_HEIGHT)
            const enterFrom = lastSwipeDir.current === 'up' ? SCREEN_HEIGHT * 0.6 : -SCREEN_HEIGHT * 0.6;
            panYPost.setValue(enterFrom);
            postTransition.setValue(0);
            Animated.parallel([
                Animated.spring(panYPost, {
                    toValue: 0,
                    useNativeDriver: true,
                    speed: 16,
                    bounciness: 0,
                }),
                Animated.timing(postTransition, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
            prevPostId.current = post.id;
        } else if (visible && post?.id) {
            prevPostId.current = post.id;
        }
    }, [post?.id, visible, postTransition]);

    const slideY = postTransition.interpolate({
        inputRange: [0, 1],
        outputRange: lastSwipeDir.current === 'down' ? [-40, 0] : [40, 0]
    });

    useEffect(() => {
        if (visible) {
            bubbleAnimReady.current = false;
            panY.setValue(SCREEN_HEIGHT);
            panX.setValue(0);
            setIsMinimized(initialMinimized);
            setActiveTab(initialTab);
            activeTabRef.current = initialTab;
            setIsExpanded(initialExpanded); // Inicializar según el prop
            Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 14,
            }).start();
            // Habilitar el spring effect interno solo después de que termina la entrada
            const timer = setTimeout(() => {
                bubbleAnimReady.current = true;
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [visible, initialMinimized, initialTab]);

    // ── Cuando se navega entre ítems (swipe), forzar minimizado si el nuevo ítem no permite comentarios ──
    const currentIsCommentable = !post?.__typename || post.__typename === 'Post' || post.__typename === 'StoreProduct';
    useEffect(() => {
        if (!visible || !post?.id) return;
        if (!currentIsCommentable) {
            // Oferta o Servicio: siempre mostrar solo la tarjeta (sin burbuja de comentarios)
            setIsMinimized(true);
        }
    }, [post?.id, visible, currentIsCommentable]);

    // ── Manejo del botón físico Back (Android) ────────────────────────────────
    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!isMinimized) {
                toggleMinimize();
            } else {
                closeWithAnimation();
            }
            return true; // consume el evento para que no cierre la pantalla anterior
        });
        return () => sub.remove();
    }, [visible, isMinimized]);

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
        onMoveShouldSetPanResponder: (_, g) => (Math.abs(g.dy) > 5 && g.dy > 0) || (g.dx < -15 && Math.abs(g.dx) > Math.abs(g.dy)),
        onPanResponderGrant: () => {
            currentGestureAxis.current = 'none';
        },
        onPanResponderMove: (_, g) => {
            if (currentGestureAxis.current === 'none') {
                if (g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx)) currentGestureAxis.current = 'vertical';
                else if (g.dx < -15 && Math.abs(g.dx) > Math.abs(g.dy)) currentGestureAxis.current = 'horizontal';
            }

            if (currentGestureAxis.current === 'vertical') {
                if (g.dy > 0) panY.setValue(g.dy);
            } else if (currentGestureAxis.current === 'horizontal') {
                panX.setValue(g.dx);
            }
        },
        onPanResponderRelease: (_, g) => {
            const currentAxis = currentGestureAxis.current;
            currentGestureAxis.current = 'none';

            if (currentAxis === 'horizontal') {
                const shouldClose = g.dx < -SCREEN_WIDTH * 0.4 || g.vx < -0.8;
                if (shouldClose) closeWithXAnimation();
                else Animated.spring(panX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            } else {
                const shouldClose = g.dy > SCREEN_HEIGHT * 0.15 || g.vy > 0.8;
                if (shouldClose) {
                    closeWithAnimation();
                } else {
                    Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
                }
            }
        },
        onPanResponderTerminate: () => {
            currentGestureAxis.current = 'none';
            Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
            Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        }
    });

    const postHeaderPan = useRef(makeDragPan()).current;

    const commentsHeaderPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && g.dy > 0,
        onPanResponderRelease: (_, g) => {
            const shouldMinimize = g.dy > SCREEN_HEIGHT * 0.15 || g.vy > 0.8;
            if (shouldMinimize && !isMinimized) {
                if (bubbleAnimReady.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                setIsMinimized(true);
                Keyboard.dismiss();
            }
        },
    })).current;

    const commentsScrollY = useRef(0);
    const commentsListSwipeDownPan = useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => {
            // Robo táctil: si deslizan hacia abajo y la lista está en tope, forzamos minimizar aunque haya pocos elementos o no tenga scroll bar
            return g.dy > 15 && commentsScrollY.current <= 2;
        },
        onPanResponderRelease: (_, g) => {
            const shouldMinimize = g.dy > SCREEN_HEIGHT * 0.15 || g.vy > 0.8;
            if (shouldMinimize && !isMinimized) {
                if (bubbleAnimReady.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                setIsMinimized(true);
                Keyboard.dismiss();
            }
        }
    })).current;

    // ── PanResponder: espacio vacío dentro del ScrollView ─────────────────
    // onStartShouldSetPanResponder:true → reclama el gesto ANTES que el ScrollView
    const emptyAreaPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
        onPanResponderRelease: (_, g) => {
            const shouldMinimize = g.dy > SCREEN_HEIGHT * 0.15 || g.vy > 0.8;
            if (shouldMinimize && !isMinimized) {
                if (bubbleAnimReady.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                setIsMinimized(true);
                Keyboard.dismiss();
            }
        }
    })).current;

    // ── Ref para activeTab (evita stale closure en PanResponders) ─────────
    const activeTabRef = useRef<'comments' | 'likes'>(initialTab);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    // ── PanResponder: swipe horizontal para cambiar de tab ────────────────
    const tabSwipePan = useRef(PanResponder.create({
        // Solo captura gestos claramente horizontales (dx >> dy)
        onMoveShouldSetPanResponderCapture: (_, g) =>
            Math.abs(g.dx) > 25 && Math.abs(g.dx) > 2.5 * Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
            if (Math.abs(g.dx) > 50 && Math.abs(g.dx) > Math.abs(g.dy)) {
                if (g.dx < -50 && activeTabRef.current === 'likes') {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                    setActiveTab('comments');
                } else if (g.dx > 50 && activeTabRef.current === 'comments') {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                    setActiveTab('likes');
                }
            }
        }
    })).current;

    // ── Scroll pull-to-close refs ──────────────────────────────────────────
    const scrollViewHeight = useRef(0);
    const scrollContentHeight = useRef(0);

    const postScrollHeight = useRef(0);
    const postScrollContentHeight = useRef(0);

    const scrollDragStartY = useRef(0);
    const postScrollDragStartY = useRef(0);

    // ── PanResponder para contenido corto en la publicación ─────────────────
    // NOTA: ya NO intercepta gestos horizontales — el ImageCarousel los maneja internamente.
    // Solo activamos para swipe vertical en contenido que no requiere scroll propio.
    const shortContentPan = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => {
            // Caso vertical (TikTok) - solo si no necesita scroll
            const isVertical = Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) &&
                               postScrollContentHeight.current <= postScrollHeight.current + 5;
            // Caso horizontal (Cierre) - siempre permitido
            const isHorizontal = g.dx < -15 && Math.abs(g.dx) > Math.abs(g.dy);
            
            return isVertical || isHorizontal;
        },
        onPanResponderGrant: () => {
            currentGestureAxis.current = 'none';
        },
        onPanResponderMove: (_, g) => {
            if (currentGestureAxis.current === 'none') {
                if (Math.abs(g.dy) > 12) currentGestureAxis.current = 'vertical';
                else if (g.dx < -15) currentGestureAxis.current = 'horizontal';
            }

            if (currentGestureAxis.current === 'vertical') {
                panYPost.setValue(g.dy);
            } else if (currentGestureAxis.current === 'horizontal') {
                panX.setValue(g.dx);
            }
        },
        onPanResponderRelease: (_, g) => {
            const currentAxis = currentGestureAxis.current;
            currentGestureAxis.current = 'none';

            if (currentAxis === 'horizontal') {
                const shouldClose = g.dx < -SCREEN_WIDTH * 0.4 || g.vx < -0.8;
                if (shouldClose) closeWithXAnimation();
                else Animated.spring(panX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            } else {
                // Lógica vertical original de TikTok
                const THRESHOLD = SCREEN_HEIGHT * 0.2;
                if (g.dy > THRESHOLD || g.vy > 0.5) {
                    Animated.timing(panYPost, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true })
                        .start(() => { lastSwipeDir.current = 'down'; callbacksRef.current.onPrevPost?.(); });
                } else if (g.dy < -THRESHOLD || g.vy < -0.5) {
                    Animated.timing(panYPost, { toValue: -SCREEN_HEIGHT, duration: 280, useNativeDriver: true })
                        .start(() => { lastSwipeDir.current = 'up'; callbacksRef.current.onNextPost?.(); });
                } else {
                    Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
                }
            }
        },
        onPanResponderTerminate: () => {
            currentGestureAxis.current = 'none';
            Animated.spring(panYPost, { toValue: 0, useNativeDriver: true }).start();
            Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        },
    })).current;

    // ── PanResponder: Footer (cambiar post + cerrar) ─────────────────────────
    const footerSwipePan = useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => {
            if (Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx)) return true;
            if (g.dx < -15 && Math.abs(g.dy) < Math.abs(g.dx)) return true;
            return false;
        },
        onPanResponderMove: (_, g) => {
            if (currentGestureAxis.current === 'none') {
                if (Math.abs(g.dy) > 15) currentGestureAxis.current = 'vertical';
                else if (g.dx < -25) currentGestureAxis.current = 'horizontal';
            }

            if (currentGestureAxis.current === 'vertical') {
                panYPost.setValue(g.dy);
            } else if (currentGestureAxis.current === 'horizontal') {
                panX.setValue(g.dx);
            }
        },
        onPanResponderRelease: (_, g) => {
            const currentAxis = currentGestureAxis.current;
            currentGestureAxis.current = 'none';

            const vy = g.vy; const dy = g.dy; const dx = g.dx; const vx = g.vx;
            if (currentAxis === 'horizontal' && ((dx < -(SCREEN_WIDTH * 0.45)) || (vx < -0.9 && dx < -50))) {
                closeWithXAnimation();
            } else if (currentAxis === 'vertical') {
                const THRESHOLD = SCREEN_HEIGHT * 0.2;
                if (dy > THRESHOLD || vy > 0.5) {
                    Animated.timing(panYPost, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true })
                        .start(() => { lastSwipeDir.current = 'down'; callbacksRef.current.onPrevPost?.(); });
                } else if (dy < -THRESHOLD || vy < -0.5) {
                    Animated.timing(panYPost, { toValue: -SCREEN_HEIGHT, duration: 280, useNativeDriver: true })
                        .start(() => { lastSwipeDir.current = 'up'; callbacksRef.current.onNextPost?.(); });
                } else {
                    Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
                }
            } else {
                Animated.spring(panX, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
            }
        },
        onPanResponderTerminate: () => {
            currentGestureAxis.current = 'none';
            Animated.spring(panYPost, { toValue: 0, useNativeDriver: true }).start();
            Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        },
    })).current;


    // ── Likes ──────────────────────────────────────────────────────────────
    const displayLiked = (isCommentable && post?.likes?.some((l: any) => l.user?.id === currentUser?.id)) || false;
    const [localLiked, setLocalLiked] = useState(displayLiked);
    const [localCount, setLocalCount] = useState<number>(isCommentable ? (post?.likes?.length || 0) : 0);
    
    const [togglePostLikeMutation] = useMutation(TOGGLE_LIKE);
    const [toggleStoreLikeMutation] = useMutation(TOGGLE_STORE_PRODUCT_LIKE);
    const toggleLikeMutation = isStore ? toggleStoreLikeMutation : togglePostLikeMutation;

    useEffect(() => {
        if (!isCommentable) return;
        setLocalLiked(post?.likes?.some((l: any) => l.user?.id === currentUser?.id) || false);
        setLocalCount(post?.likes?.length || 0);
    }, [post?.likes, isCommentable]);

    const handleLike = () => {
        if (!currentUser?.id || !postId) return;
        const next = !localLiked;
        setLocalLiked(next);
        setLocalCount((c) => next ? c + 1 : Math.max(0, c - 1));

        let optimisticLikes = [...(post?.likes || [])];
        if (localLiked) {
            optimisticLikes = optimisticLikes.filter((l: any) => l.user?.id !== currentUser.id);
        } else {
            optimisticLikes.push({
                __typename: isStore ? 'StoreProductLike' : 'PostLike',
                id: `temp-${Date.now()}`,
                user: {
                    __typename: 'User',
                    id: currentUser.id,
                    firstName: currentUser.firstName || '',
                    lastName: currentUser.lastName || '',
                    photoUrl: currentUser.photoUrl || null,
                }
            });
        }

        const variables = isStore ? { productId: postId } : { postId };
        const opResponseFields = isStore ? { toggleStoreProductLike: { __typename: 'StoreProduct', id: postId, commentsCount: post?.commentsCount ?? post?.comments?.length ?? 0, likes: optimisticLikes }} : { toggleLike: { __typename: 'Post', id: postId, commentsCount: post?.commentsCount ?? post?.comments?.length ?? 0, likes: optimisticLikes } };

        toggleLikeMutation({
            variables: variables,
            optimisticResponse: opResponseFields as any,
        }).catch(() => {
            setLocalLiked(!next);
            setLocalCount((c) => !next ? c + 1 : Math.max(0, c - 1));
        });
    };

    // ── Comments query ─────────────────────────────────────────────────────
    const COMMENTS_PAGE_SIZE = 10;
    const postQuery = useQuery(GET_COMMENTS, {
        variables: { postId: postId || '', limit: COMMENTS_PAGE_SIZE, offset: 0 },
        skip: !postId || !isPost,
        fetchPolicy: 'cache-and-network',
    });
    
    const storeQuery = useQuery(GET_STORE_PRODUCT_COMMENTS, {
        variables: { productId: postId || '', limit: COMMENTS_PAGE_SIZE, offset: 0 },
        skip: !postId || !isStore,
        fetchPolicy: 'cache-and-network',
    });

    const currentQuery = isStore ? storeQuery : postQuery;
    const { data, loading, error, refetch } = currentQuery;
    const currentDataList = isStore ? data?.getStoreProductComments : data?.getCommentsByPost;

    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [isFetchingMoreComments, setIsFetchingMoreComments] = useState(false);

    // Reset al cambiar de post
    useEffect(() => {
        setHasMoreComments(true);
    }, [postId]);

    const loadMoreComments = useCallback(() => {
        const currentComments = currentDataList;
        if (isFetchingMoreComments || !hasMoreComments || !currentComments) return;

        setIsFetchingMoreComments(true);
        const fetchVars = isStore ? { productId: postId, limit: COMMENTS_PAGE_SIZE, offset: currentComments.length } : { postId, limit: COMMENTS_PAGE_SIZE, offset: currentComments.length };
        
        currentQuery.fetchMore({
            variables: fetchVars,
        }).then((result: any) => {
            const newComments = isStore ? result?.data?.getStoreProductComments : result?.data?.getCommentsByPost;
            if (!newComments || newComments.length < COMMENTS_PAGE_SIZE) {
                setHasMoreComments(false);
            }
        }).finally(() => setIsFetchingMoreComments(false));
    }, [currentDataList, isFetchingMoreComments, hasMoreComments, postId, currentQuery, isStore]); 

    // Preferimos post.commentsCount (total con respuestas, viene del feed)
    // Si no está disponible, contamos los comentarios raíz de la query local
    const commentsCount = post?.commentsCount ?? currentDataList?.length ?? 0;

    const [createPostCommentMutation, { loading: creatingPost }] = useMutation(CREATE_COMMENT, {
        refetchQueries: [{ query: GET_COMMENTS, variables: { postId: postId || '', limit: COMMENTS_PAGE_SIZE, offset: 0 } }],
        update(cache) {
            if (!postId) return;
            cache.modify({
                id: cache.identify({ __typename: 'Post', id: postId }),
                fields: {
                    commentsCount(current = 0) { return current + 1; },
                }
            });
        },
    });

    const [createStoreCommentMutation, { loading: creatingStore }] = useMutation(CREATE_STORE_PRODUCT_COMMENT, {
        refetchQueries: [{ query: GET_STORE_PRODUCT_COMMENTS, variables: { productId: postId || '', limit: COMMENTS_PAGE_SIZE, offset: 0 } }],
        update(cache) {
            if (!postId) return;
            cache.modify({
                id: cache.identify({ __typename: 'StoreProduct', id: postId }),
                fields: {
                    commentsCount(current = 0) { return current + 1; },
                }
            });
        },
    });

    const creating = creatingPost || creatingStore;
    const createComment = isStore ? createStoreCommentMutation : createPostCommentMutation;

    const [deletePostCommentMutation] = useMutation(DELETE_COMMENT, {
        update(cache, { data: { deleteComment: success } }, { variables }) {
            if (!success) return;
            const commentId = variables?.id;
            cache.evict({ id: cache.identify({ __typename: 'Comment', id: commentId }) });
            cache.gc();
            if (postId) {
                cache.modify({
                    id: cache.identify({ __typename: 'Post', id: postId }),
                    fields: { commentsCount(current = 0) { return Math.max(0, current - 1); } }
                });
            }
        }
    });

    const [deleteStoreCommentMutation] = useMutation(DELETE_STORE_PRODUCT_COMMENT, {
        update(cache, { data: { deleteStoreProductComment: success } }, { variables }) {
            if (!success) return;
            const commentId = variables?.commentId;
            cache.evict({ id: cache.identify({ __typename: 'StoreProductComment', id: commentId }) });
            cache.gc();
            if (postId) {
                cache.modify({
                    id: cache.identify({ __typename: 'StoreProduct', id: postId }),
                    fields: { commentsCount(current = 0) { return Math.max(0, current - 1); } }
                });
            }
        }
    });

    const handleDeleteComment = (id: string) => {
        // El id ya viene en selectedCommentData.id, pero lo recibimos por si acaso desde el modal
        setIsDeleteConfirmVisible(true);
    };

    const onConfirmDelete = async () => {
        if (!selectedCommentData?.id) return;
        try {
            setIsDeleteConfirmVisible(false);
            if (isStore) {
                await deleteStoreCommentMutation({ variables: { commentId: selectedCommentData.id } });
            } else {
                await deletePostCommentMutation({ variables: { id: selectedCommentData.id } });
            }
        } catch (e) {
            console.error('Error al eliminar comentario:', e);
            Alert.alert('Error', 'No se pudo eliminar el comentario');
        }
    };

    const handleReport = (id: string) => {
        setReportVisible(true);
    };

    const [updateComment, { loading: updating }] = useMutation(UPDATE_COMMENT);

    const handleCancelEdit = () => {
        setContent('');
        setEditingCommentId(null);
        Keyboard.dismiss();
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
        Keyboard.dismiss();
    };

    const handleSend = async () => {
        if (!content.trim() || !postId || !currentUser) return;
        try {
            const commentText = content.trim();

            if (editingCommentId && !isStore) {
                // Store comments do not support editing currently.
                const originalComment = currentDataList?.find((c: any) => c.id === editingCommentId);

                await updateComment({
                    variables: { id: editingCommentId, content: commentText },
                    optimisticResponse: {
                        updateComment: {
                            __typename: 'Comment',
                            id: editingCommentId,
                            content: commentText,
                            createdAt: originalComment?.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            likesCount: originalComment?.likesCount || 0,
                            isLikedByMe: originalComment?.isLikedByMe || false,
                            replies: originalComment?.replies || [],
                        }
                    },
                    update(cache, { data: { updateComment: updated } }) {
                        if (!updated || !postId) return;

                        // Forzamos la actualización de la lista de comentarios en el cache
                        const existing = cache.readQuery<{ getCommentsByPost: any[] }>({
                            query: GET_COMMENTS,
                            variables: { postId, limit: COMMENTS_PAGE_SIZE, offset: 0 }
                        });

                        if (existing) {
                            const newComments = existing.getCommentsByPost.map(c =>
                                c.id === updated.id ? { ...c, content: updated.content } : c
                            );
                            cache.writeQuery({
                                query: GET_COMMENTS,
                                variables: { postId, limit: COMMENTS_PAGE_SIZE, offset: 0 },
                                data: { getCommentsByPost: newComments }
                            });
                        }
                    }
                });
            } else {
                await createComment({
                    variables: isStore ? {
                        productId: postId,
                        content: commentText,
                        parentId: replyingTo?.id
                    } : {
                        postId,
                        content: commentText,
                        parentId: replyingTo?.id
                    },
                    optimisticResponse: isStore ? {
                        createStoreProductComment: {
                            __typename: 'StoreProductComment',
                            id: `temp-${Date.now()}`,
                            content: commentText,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            parentId: replyingTo?.id || null,
                            likesCount: 0,
                            isLikedByMe: false,
                            user: {
                                __typename: 'User',
                                id: currentUser.id,
                                username: currentUser.username || '',
                                firstName: currentUser.firstName,
                                lastName: currentUser.lastName,
                                photoUrl: currentUser.photoUrl || null,
                            },
                        }
                    } : {
                        createComment: {
                            __typename: 'Comment',
                            id: `temp-${Date.now()}`,
                            content: commentText,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            parentId: replyingTo?.id || null,
                            likesCount: 0,
                            isLikedByMe: false,
                            user: {
                                __typename: 'User',
                                id: currentUser.id,
                                username: currentUser.username || '',
                                firstName: currentUser.firstName,
                                lastName: currentUser.lastName,
                                photoUrl: currentUser.photoUrl || null,
                            },
                            replies: [],
                        },
                    },
                });
            }

            setContent('');
            setEditingCommentId(null);
            setReplyingTo(null);
            Keyboard.dismiss();
        } catch (e) {
            console.error(e);
        }
    };


    // ── Render comentario ──────────────────────────────────────────────────
    const renderComment = (item: any) => (
        <CommentItem
            key={item.id}
            item={item}
            currentUser={currentUser}
            onLongPress={(pressedItem, isReply) => {
                const isMine = pressedItem.user?.id === currentUser?.id;
                setSelectedCommentData({ id: pressedItem.id, isMine, isReply });
                setIsOptionsModalVisible(true);
            }}
            onNavigateToProfile={navigateToProfile}
            onReply={(id: string, name: string) => {
                setReplyingTo({ id, name });
                setTimeout(() => inputRef.current?.focus(), 100);
            }}
            isStore={isStore}
        />
    );

    if (!visible) return null;

    const isEdited = post?.updatedAt &&
        new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 2000;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={() => {
                if (!isMinimized) {
                    toggleMinimize();
                } else {
                    closeWithAnimation();
                }
            }}
            statusBarTranslucent
        >



            {/* Este fondo ahora es semi-transparente para dar enfoque pero dejar ver lo de abajo */}
            <Animated.View
                style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
                {...backgroundSwipePan.panHandlers}
            />

            {/* Exterior: mueve bottom con el teclado (JS driver) */}
            <Animated.View
                style={[styles.container, { top: insets.top + TOP_SPACING, bottom: keyboardOffset }]}
                pointerEvents="box-none"
            >
                {/* Interior: drag translateY (native driver) */}
                {/* Cuando minimizado: centra el postBubble verticalmente con justifyContent */}
                <Animated.View
                    style={[
                        { flex: 1, gap: 8 },
                        effectiveIsMinimized ? { justifyContent: 'center', paddingBottom: BOTTOM_SPACING } : {},
                        { transform: [{ translateY: panY }, { translateY: panYPost }] }
                    ]}
                    pointerEvents="box-none"
                >

                    {/* ── BURBUJA PUBLICACIÓN ── */}
                    {post && (
                        <Animated.View
                            style={[
                                styles.postBubble,
                                isMinimized
                                    ? { flexShrink: 1, maxHeight: SCREEN_HEIGHT - insets.top - TOP_SPACING - BOTTOM_SPACING }
                                    // POST_EXPANDED_MAX_HEIGHT en línea superior: ajusta su fracción
                                    : { maxHeight: POST_EXPANDED_MAX_HEIGHT, flexShrink: 1 },
                                { opacity: postTransition, transform: [{ translateY: slideY }, { translateX: panX }] }
                            ]}
                            {...tiktokSwipePan.panHandlers}
                        >
                            <View style={[styles.postHeader, { borderBottomColor: colors.border }]} {...postHeaderPan.panHandlers}>
                                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                                
                                {!isPost && (
                                    <View style={{ width: '100%', marginBottom: 6, paddingLeft: 0 }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(255,101,36,0.08)',
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            alignSelf: 'flex-start',
                                            borderLeftWidth: 4,
                                            borderLeftColor: '#FF6524',
                                            borderTopRightRadius: 8,
                                            borderBottomRightRadius: 8,
                                        }}>
                                            <Text style={{ 
                                                color: '#FF6524', 
                                                fontSize: 10, 
                                                fontWeight: '800',
                                                letterSpacing: 1,
                                            }}>
                                                {post.__typename === 'JobOffer' ? 'OFERTA DE EMPLEO' : (post.__typename === 'StoreProduct' ? 'TIENDA' : 'SERVICIO PROFESIONAL')}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.postAuthorRow}
                                    onPress={() => {
                                        const profileId = isPost
                                            ? post.author?.id
                                            : (post.author?.id ?? post.user?.id ?? post.seller?.id);
                                        if (profileId) navigateToProfile(profileId);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Avatar — usa author para Post/JobOffer, user para ProfessionalProfile */}
                                    <View style={[styles.avatarPlaceholder, { marginRight: 12 }]}>
                                        {(() => {
                                            const photoUrl = isPost
                                                ? post.author?.photoUrl
                                                : (post.author?.photoUrl ?? post.user?.photoUrl ?? post.seller?.photoUrl);
                                            const firstName = isPost ? post.author?.firstName : (post.author?.firstName ?? post.user?.firstName ?? post.seller?.firstName);
                                            const lastName = isPost ? post.author?.lastName : (post.author?.lastName ?? post.user?.lastName ?? post.seller?.lastName);

                                            const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
                                            return photoUrl
                                                ? <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                                                : <Text style={styles.avatarText}>{initials}</Text>;
                                        })()}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        {/* Nombre + badge de tipo */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                            <Text style={[styles.postAuthorName, { color: colors.text }]}>
                                                {isPost
                                                    ? `${post.author?.firstName ?? ''} ${post.author?.lastName ?? ''}`
                                                    : `${(post.author?.firstName ?? post.user?.firstName ?? post.seller?.firstName) ?? ''} ${(post.author?.lastName ?? post.user?.lastName ?? post.seller?.lastName) ?? ''}`
                                                }
                                            </Text>
                                        </View>
                                        <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                                            {formatDate(post.createdAt)}{isPost && isEdited ? ' · Editado' : ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={{ flexDirection: 'row', alignItems: 'center', position: 'absolute', right: 14, top: 14, zIndex: 10 }}>
                                    {(() => {
                                        const profileId = isPost
                                            ? post.author?.id
                                            : (post.author?.id ?? post.user?.id ?? post.seller?.id);
                                        const isOwner = profileId === currentUser?.id;
                                        
                                        return (
                                            <>
                                                {isOwner && (
                                                    <TouchableOpacity
                                                        onPress={() => onOptionsPress?.(post)}
                                                        style={{ marginRight: 16 }}
                                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                    >
                                                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                                                    </TouchableOpacity>
                                                )}
                                                {!isOwner && (
                                                    <TouchableOpacity
                                                        onPress={() => setPostReportVisible(true)}
                                                        style={{ marginRight: 16 }}
                                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                    >
                                                        <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        );
                                    })()}

                                    <TouchableOpacity onPress={closeWithAnimation}
                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView
                                ref={scrollViewRef}
                                showsVerticalScrollIndicator={!isPost}
                                persistentScrollbar={true}
                                indicatorStyle={isDark ? 'white' : 'black'}
                                nestedScrollEnabled={true}
                                scrollEnabled={postScrollEnabled}
                                bounces={false}
                                alwaysBounceVertical={false}
                                overScrollMode="never"
                                contentContainerStyle={{ paddingBottom: 0 }}
                                style={styles.postScrollView}
                                scrollEventThrottle={8}
                                onLayout={(e) => {
                                    postScrollHeight.current = e.nativeEvent.layout.height;
                                }}
                                onContentSizeChange={(_, h) => {
                                    postScrollContentHeight.current = h;
                                }}
                                onScroll={(e) => {
                                    const y = e.nativeEvent.contentOffset.y;
                                    currentScrollY.current = y;
                                    if (y > 10) hasScrolledDown.current = true;
                                }}
                                onScrollBeginDrag={(e) => {
                                    postScrollDragStartY.current = e.nativeEvent.contentOffset.y;
                                    setScrollEnabled(true);
                                }}
                                onMomentumScrollEnd={(e) => {
                                    const y = e.nativeEvent.contentOffset.y;
                                    currentScrollY.current = y;
                                    const atTop = y <= 2;
                                    const atBottom = y + postScrollHeight.current >= postScrollContentHeight.current - 2;
                                    if (atTop || atBottom) setScrollEnabled(false);
                                    else setScrollEnabled(true);
                                }}
                                onScrollEndDrag={(e) => {
                                    const endY = e.nativeEvent.contentOffset.y;
                                    const vy = e.nativeEvent.velocity?.y ?? 0;
                                    const atTop = endY <= 3;
                                    const atBottom = endY + postScrollHeight.current >= postScrollContentHeight.current - 3;
                                    if (atTop && vy >= -0.1) setScrollEnabled(false);
                                    else if (atBottom && vy <= 0.1) setScrollEnabled(false);
                                    else if (!atTop && !atBottom) setScrollEnabled(true);
                                    if (postScrollDragStartY.current <= 5 && endY <= 5 && vy > 0.5) {
                                        Animated.timing(panYPost, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true })
                                            .start(() => { lastSwipeDir.current = 'down'; callbacksRef.current.onPrevPost?.(); });
                                    } else if (
                                        postScrollDragStartY.current + postScrollHeight.current >= postScrollContentHeight.current - 5 &&
                                        endY + postScrollHeight.current >= postScrollContentHeight.current - 5 &&
                                        vy < -0.5
                                    ) {
                                        if (navRef.current.nextPost) {
                                            Animated.timing(panYPost, { toValue: -SCREEN_HEIGHT, duration: 280, useNativeDriver: true })
                                                .start(() => { lastSwipeDir.current = 'up'; callbacksRef.current.onNextPost?.(); });
                                        } else if (callbacksRef.current.hasMorePosts) {
                                            Animated.spring(panYPost, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
                                            callbacksRef.current.onNextPost?.();
                                        }
                                    }
                                }}
                            >
                                {/* ── Contenido según tipo ── */}
                                {!isPost ? (
                                    // JobOffer o ProfessionalProfile: tarjeta completa con gestos de cierre
                                    <Animated.View
                                        collapsable={false}
                                        {...shortContentPan.panHandlers}
                                        style={{ flex: 1 }}
                                    >
                                        {post.__typename === 'JobOffer' && (
                                            <JobOfferCard item={normalizedItem} onPress={undefined} hideAuthorRow isModalView={true} />
                                        )}
                                        {post.__typename === 'ProfessionalProfile' && (
                                            <ProfessionalCard item={normalizedItem} onPress={undefined} hideAuthorRow isModalView={true} />
                                        )}
                                        {post.__typename === 'StoreProduct' && (
                                            <StoreProductCard item={normalizedItem} onPress={undefined} hideSellerRow isModalView={true} />
                                        )}
                                    </Animated.View>
                                ) : (
                                    <>
                                    <Animated.View collapsable={false} {...shortContentPan.panHandlers} style={{ paddingHorizontal: 16, paddingTop: 8, overflow: 'hidden', zIndex: 1 }}>
                                    <View style={{ marginBottom: 1 }}>
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={() => isTextLong && setIsExpanded(!isExpanded)}
                                            onLongPress={() => setIsCopyModalVisible(true)}
                                            delayLongPress={250}
                                        >
                                            {post.title && (
                                                <Text style={[styles.postTitleTitle, { color: colors.text }]}>{post.title}</Text>
                                            )}
                                            <Text style={[styles.postContent, { color: colors.text }]}>
                                                {displayContent}
                                                {isTextLong && !isExpanded && (
                                                    <Text
                                                        onPress={() => setIsExpanded(true)}
                                                        style={[styles.seeMoreText, { color: colors.primary }]}
                                                    >
                                                        ... más
                                                    </Text>
                                                )}
                                            </Text>
                                        </TouchableOpacity>

                                        {isTextLong && isExpanded && (
                                            <TouchableOpacity
                                                onPress={() => setIsExpanded(false)}
                                                style={styles.seeMoreBtn}
                                            >
                                                <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                                                    Ver menos
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    </Animated.View>

                                    {/* ── Media Adjunta (Carrusel) dentro del Modal ── */}
                                    {normalizedItem?.media && normalizedItem.media.length > 0 && (
                                        <View collapsable={false} style={{ marginTop: 12, marginHorizontal: -16, overflow: 'hidden', borderRadius: 0.1, zIndex: 5, backgroundColor: '#000' }}>
                                            <ImageCarousel
                                                key={post?.id}
                                                media={normalizedItem.media}
                                                containerWidth={SCREEN_WIDTH}
                                                imageResizeMode="cover"
                                                dynamicAspectRatio={false}
                                                customAspectRatio={1080 / 1440}
                                                isInteractive={true}
                                                onSwipeClose={(carouselPanX) => {
                                                    carouselPanX.addListener(({ value }) => panX.setValue(value));
                                                    closeWithXAnimation();
                                                }}
                                            />
                                        </View>
                                    )}
                                    </>
                                )}
                            </ScrollView>

                            {/* Footer con Like/Comentar */}
                            {isCommentable && (
                            <Animated.View {...footerSwipePan.panHandlers} style={[styles.postFooterFixed, { borderTopColor: colors.border }]}>
                                {(localCount > 0 || commentsCount > 0) && (
                                    <TouchableOpacity activeOpacity={1} style={styles.statsRow}>
                                        {/* Comentarios a la izquierda */}
                                        <TouchableOpacity onPress={() => { setActiveTab('comments'); if (isMinimized) toggleMinimize(); }}>
                                            {commentsCount > 0 && (
                                                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                                                    {commentsCount} {commentsCount === 1 ? 'comentario' : 'comentarios'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>

                                        {/* Likes a la derecha */}
                                        <TouchableOpacity onPress={() => { setActiveTab('likes'); if (isMinimized) toggleMinimize(); }}>
                                            {localCount > 0 && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="heart" size={15} color="#FF3B30" />
                                                    <Text style={[styles.statsText, { color: colors.textSecondary, marginLeft: 4 }]}>{localCount}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                )}
                                {/* actionsRow como TouchableOpacity para capturar gestos en huecos */}
                                <TouchableOpacity activeOpacity={1} style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                                        <Ionicons name={localLiked ? 'heart' : 'heart-outline'} size={20}
                                            color={localLiked ? '#FF3B30' : colors.textSecondary} />
                                        <Text style={[styles.actionText, { color: localLiked ? '#FF3B30' : colors.textSecondary },
                                        localLiked && { fontWeight: 'bold' }]}>Like</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                                        setActiveTab('comments');
                                        if (isMinimized) toggleMinimize();
                                    }}>
                                        <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>Comentar</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            </Animated.View>
                            )}
                        </Animated.View>
                    )}

                    {/* ── BUBBLE COMENTARIOS ── */}
                    {!effectiveIsMinimized && isCommentable && (
                        <Animated.View style={[styles.commentsBubble, { flex: 1 }, { opacity: postTransition, transform: [{ translateY: slideY }] }]} {...tabSwipePan.panHandlers}>

                            <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]} {...commentsHeaderPan.panHandlers}>
                                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

                                <Text style={[styles.headerTitle, { color: colors.text }]}>{activeTab === 'comments' ? 'Comentarios' : 'Me gusta'}</Text>

                                <TouchableOpacity onPress={toggleMinimize} style={styles.closeBtn}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                    <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Animated.View style={{ flex: 1 }} {...commentsListSwipeDownPan.panHandlers}>
                                <ScrollView
                                    style={{ flex: 1 }}
                                    contentContainerStyle={styles.listContainer}
                                    showsVerticalScrollIndicator={false}
                                    bounces={true}
                                    alwaysBounceVertical={true}
                                    overScrollMode="always"
                                    keyboardShouldPersistTaps="handled"
                                    scrollEventThrottle={8}
                                    onLayout={(e) => {
                                        scrollViewHeight.current = e.nativeEvent.layout.height;
                                    }}
                                    onContentSizeChange={(_, h) => {
                                        scrollContentHeight.current = h;
                                    }}
                                    onScroll={(e) => {
                                        const y = e.nativeEvent.contentOffset.y;
                                        commentsScrollY.current = y;
                                        // Auto-carga al acercarse al fondo
                                        const contentH = scrollContentHeight.current;
                                        const viewH = scrollViewHeight.current;
                                        if (contentH > viewH && y + viewH >= contentH - 80 && activeTab === 'comments') {
                                            loadMoreComments();
                                        }
                                    }}
                                    onScrollBeginDrag={(e) => {
                                        scrollDragStartY.current = e.nativeEvent.contentOffset.y;
                                    }}
                                    onScrollEndDrag={(e) => {
                                        const endY = e.nativeEvent.contentOffset.y;
                                        const vy = e.nativeEvent.velocity?.y ?? 0;
                                        if (scrollDragStartY.current <= 2 && endY <= 2 && vy > 0.3) {
                                            if (!isMinimized) {
                                                if (bubbleAnimReady.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                                                setIsMinimized(true);
                                                Keyboard.dismiss();
                                            }
                                        }
                                    }}
                                >
                                    {activeTab === 'likes' ? (
                                        (!post?.likes || post.likes.length === 0) ? (
                                            <View style={[styles.center, { flex: 1 }]} {...emptyAreaPan.panHandlers}>
                                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                                    Nadie le ha dado like a esta publicación aún.
                                                </Text>
                                            </View>
                                        ) : (
                                            <>
                                                {[...post.likes]
                                                    .sort((a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime())
                                                    .map((like: any) => (
                                                        <TouchableOpacity key={like.id || like.user?.id} style={[styles.likeItemContainer, { borderBottomColor: colors.border }]} onPress={() => navigateToProfile(like.user?.id)}>
                                                            <View style={[styles.likeAvatarWrap, { borderColor: 'rgba(255, 101, 36, 0.35)', borderWidth: 1.5 }]}>
                                                                {like.user?.photoUrl ? (
                                                                    <Image source={{ uri: like.user.photoUrl }} style={styles.likeAvatarImg} />
                                                                ) : (
                                                                    <Text style={styles.likeAvatarInitials}>
                                                                        {like.user?.firstName?.[0] || ''}{like.user?.lastName?.[0] || ''}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                            <Text style={[styles.likeUserName, { color: colors.text }]}>
                                                                {like.user?.firstName} {like.user?.lastName}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))
                                                }
                                                <View style={{ flex: 1, minHeight: 80 }} {...emptyAreaPan.panHandlers} />
                                            </>
                                        )
                                    ) : (
                                        loading && !data ? (
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
                                        ) : (!currentDataList || currentDataList.length === 0) ? (
                                            <View style={[styles.center, { flex: 1 }]} {...emptyAreaPan.panHandlers}>
                                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                                    No hay comentarios aún. ¡Sé el primero!
                                                </Text>
                                            </View>
                                        ) : (
                                            <>
                                                {[...(currentDataList || [])]
                                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                    .map((item: any) => renderComment(item))}
                                                {/* Spinner o mensaje de fin */}
                                                {isFetchingMoreComments ? (
                                                    <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 16 }} />
                                                ) : !hasMoreComments && (currentDataList?.length ?? 0) > 0 ? (
                                                    <Text style={{ textAlign: 'center', color: colors.textSecondary, paddingVertical: 12, fontSize: 12 }}>
                                                        No hay más comentarios
                                                    </Text>
                                                ) : null}
                                                {/* Zona arrastrable en espacio vacío bajo los últimos comentarios */}
                                                <View style={{ flex: 1, minHeight: 80 }} {...emptyAreaPan.panHandlers} />
                                            </>
                                        )
                                    )}
                                </ScrollView>

                                {activeTab === 'comments' && editingCommentId && (
                                    <View style={[styles.editingBar, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.editingText, { color: colors.textSecondary }]}>
                                            Editando comentario...
                                        </Text>
                                        <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                                            <Text style={[styles.cancelEditText, { color: colors.primary }]}>Cancelar</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeTab === 'comments' && replyingTo && (
                                    <View style={[styles.replyBar, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.replyBarText, { color: colors.textSecondary }]}>
                                            Respondiendo a <Text style={{ fontWeight: 'bold' }}>{replyingTo.name}</Text>
                                        </Text>
                                        <TouchableOpacity onPress={handleCancelReply} style={styles.cancelReplyBtn}>
                                            <Ionicons name="close-circle" size={20} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeTab === 'comments' && (
                                    <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
                                        <TextInput
                                            ref={inputRef}
                                            style={[styles.input, { color: colors.text }]}
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
                                )}
                            </Animated.View>
                        </Animated.View>
                    )}

                </Animated.View>

                {/* ── NAV BAR INFERIOR NEGRA (Minimizado) ── */}
                {isMinimized && isCommentable && (
                    <View style={{
                        position: 'absolute',
                        left: -4,
                        right: -4,
                        bottom: -Math.max(insets.bottom, 16),
                        backgroundColor: '#000000',
                        paddingBottom: Math.max(insets.bottom, 16) + 4,
                        paddingTop: 10,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: '#333333'
                    }}>
                        <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => { setActiveTab('likes'); if (isMinimized) toggleMinimize(); }} style={{ alignItems: 'center', flex: 1 }}>
                                <Ionicons name="heart-outline" size={22} color={activeTab === 'likes' ? colors.primary : "#FFFFFF"} />
                                <Text style={{ color: activeTab === 'likes' ? colors.primary : '#FFFFFF', marginTop: 2, fontSize: 11, fontWeight: '500' }}>Likes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setActiveTab('comments'); if (isMinimized) toggleMinimize(); }} style={{ alignItems: 'center', flex: 1 }}>
                                <Ionicons name="chatbubbles-outline" size={22} color={activeTab === 'comments' ? colors.primary : "#FFFFFF"} />
                                <Text style={{ color: activeTab === 'comments' ? colors.primary : '#FFFFFF', marginTop: 2, fontSize: 11, fontWeight: '500' }}>Comentarios</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Animated.View>

            <CommentOptionsModal
                visible={isOptionsModalVisible}
                commentData={selectedCommentData}
                onClose={() => setIsOptionsModalVisible(false)}
                onEdit={(id) => {
                    const commentToEdit = currentDataList?.find((c: any) => c.id === id);
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
                onReport={handleReport}
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
            <CopyTextModal
                visible={isCopyModalVisible}
                textToCopy={post?.content || ''}
                onClose={() => setIsCopyModalVisible(false)}
            />

            {reportVisible && selectedCommentData && (
                <ReportModal
                    visible={reportVisible}
                    onClose={() => setReportVisible(false)}
                    reportedItemId={selectedCommentData.id}
                    reportedItemType="COMMENT"
                    onContentDeleted={() => {
                        // 1. Evictar el comentario del caché Apollo → desaparece al instante
                        apolloClient.cache.evict({
                            id: apolloClient.cache.identify({
                                __typename: 'Comment',
                                id: selectedCommentData.id,
                            }),
                        });
                        apolloClient.cache.gc();
                        // 2. Cerrar el modal de denuncia
                        setReportVisible(false);
                        // 3. Refetch para sincronizar con el servidor
                        refetch();
                    }}
                />
            )}

            {postReportVisible && post && (
                <ReportModal
                    visible={postReportVisible}
                    onClose={() => setPostReportVisible(false)}
                    reportedItemId={post.id}
                    reportedItemType={{
                        'StoreProduct': 'STORE_PRODUCT',
                        'JobOffer': 'JOB_OFFER',
                        'ProfessionalProfile': 'SERVICE',
                        'Post': 'POST',
                    }[post?.__typename || 'Post'] || 'POST'}
                    onContentDeleted={() => {
                        apolloClient.cache.evict({
                            id: apolloClient.cache.identify({
                                __typename: post.__typename || 'Post',
                                id: post.id,
                            }),
                        });
                        apolloClient.cache.gc();
                        setPostReportVisible(false);
                        closeWithAnimation();
                    }}
                />
            )}
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
        left: 4,
        right: 4,
    },
    postBubble: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        borderWidth: 0,
        // Fondo adaptado al tema (no negro total)
        backgroundColor: colors.surface,
    },
    postScrollView: {
        flexShrink: 1,
    },
    postScrollContent: {
        paddingBottom: 16
    },
    postHeader: {
        paddingTop: 14,
        paddingBottom: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    postAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
        paddingRight: 24,
    },
    postAuthorName: { fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
    postDate: { fontSize: 12 },
    postTitleTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
    postContent: { fontSize: 15, lineHeight: 22 },
    seeMoreBtn: {
        marginTop: 4,
        alignSelf: 'flex-start',
        paddingVertical: 2,
    },
    seeMoreText: {
        fontSize: 14,
        fontWeight: '700',
    },
    postFooterFixed: { },
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
        borderWidth: 0,
        backgroundColor: colors.surface,
    },
    commentsHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 7,
        paddingBottom: 6,
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
    postCloseBtn: { position: 'absolute', right: 14, top: 14, zIndex: 10 },
    minimizeBtn: { position: 'absolute', left: 14, top: 12, zIndex: 10 },
    closeBtn: { position: 'absolute', right: 14, top: 12, zIndex: 10 },
    listContainer: { flexGrow: 1, padding: 14, paddingBottom: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    emptyText: { textAlign: 'center', fontSize: 15, color: colors.textSecondary },
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
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.05)',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    replyBarText: {
        fontSize: 13,
    },
    cancelReplyBtn: {
        padding: 4,
    },
    likeItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    likeAvatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 101, 36, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    likeAvatarImg: { width: '100%', height: '100%' },
    likeAvatarInitials: {
        color: '#FF6524',
        fontWeight: 'bold',
        fontSize: 16,
    },
    likeUserName: {
        fontSize: 16,
        fontWeight: '600',
    },
});
