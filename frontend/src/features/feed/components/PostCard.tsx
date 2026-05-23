import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useMutation, useApolloClient } from '@apollo/client/react';
import { TOGGLE_LIKE } from '../graphql/posts.operations';
import CopyTextModal from '../../../components/CopyTextModal';
import ImageCarousel from './ImageCarousel';
import { Dimensions } from 'react-native';
import ReportModal from '../../reports/components/ReportModal';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 4;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);

const MAX_CHARS = 150;

export interface PostCardProps {
    item: any;
    currentUserId?: string;
    onOptionsPress?: (post: any) => void;
    onOpenComments?: (postId: string, initialTab?: 'comments' | 'likes', minimize?: boolean, initialExpanded?: boolean) => void;
    isModalView?: boolean;
    headerPanHandlers?: any;
    onScroll?: (event: any) => void;
    isViewable?: boolean;
    isFocused?: boolean;
    isOverlayActive?: boolean;
    onPressAuthor?: () => void;
    onToggleSave?: () => void;
    isSaved?: boolean;
    showTopDivider?: boolean;
}

export default function PostCard({
    item,
    currentUserId,
    onOptionsPress,
    onOpenComments,
    isModalView = false,
    headerPanHandlers,
    isViewable,
    isFocused = true,
    isOverlayActive = false,
    onPressAuthor,
    onToggleSave,
    isSaved: propIsSaved,
    showTopDivider,
}: PostCardProps) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const router = useRouter();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const client = useApolloClient();

    const authContext = useAuth() as any;
    const userId = authContext.user?.id || currentUserId;

    const isEdited = !!item.editedAt;
    const displayIsSaved = propIsSaved ?? item.isSaved;

    const displayCount = item.likes?.length || 0;
    const commentsCount = item.commentsCount ?? item.comments?.length ?? 0;
    const displayLiked = item.likes?.some((like: any) => like.user?.id === userId) || false;

    const [localCount, setLocalCount] = useState<number>(displayCount);
    const [localLiked, setLocalLiked] = useState<boolean>(displayLiked);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [cardWidth, setCardWidth] = useState(SCREEN_WIDTH);
    const [activeIndex, setActiveIndex] = useState(0);

    const isTruncatable = !isModalView && (item.content?.length ?? 0) > MAX_CHARS;
    const displayContent = isTruncatable && !isExpanded
        ? item.content.slice(0, MAX_CHARS).trimEnd() 
        : (item.content ?? '');

    useEffect(() => {
        setLocalCount(displayCount);
        setLocalLiked(displayLiked);
    }, [displayCount, displayLiked]);

    const [toggleLikeMutation] = useMutation(TOGGLE_LIKE);

    const handleLikePress = () => {
        if (!userId) return;

        const nextLiked = !localLiked;
        setLocalLiked(nextLiked);
        setLocalCount(c => nextLiked ? c + 1 : Math.max(0, c - 1));

        let optimisticLikes = [...(item.likes || [])];
        if (displayLiked) {
            optimisticLikes = optimisticLikes.filter((like: any) => like.user?.id !== userId);
        } else {
            optimisticLikes.push({
                __typename: 'PostLike',
                id: `temp-${Date.now()}`,
                user: {
                    __typename: 'User',
                    id: userId,
                    firstName: authContext.user?.firstName || '',
                    lastName: authContext.user?.lastName || '',
                    photoUrl: authContext.user?.photoUrl || null,
                }
            });
        }

        toggleLikeMutation({
            variables: { postId: item.id },
            refetchQueries: ['GetLikedItems'],
            optimisticResponse: {
                toggleLike: {
                    __typename: 'Post',
                    id: item.id,
                    commentsCount: item.commentsCount ?? item.comments?.length ?? 0,
                    likes: optimisticLikes,
                }
            }
        }).catch(() => {
            setLocalLiked(displayLiked);
            setLocalCount(displayCount);
        });
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

    const goToProfile = () => {
        if (onPressAuthor) {
            onPressAuthor();
            return;
        }
        const profileUserId = item.author.id === userId ? undefined : item.author.id;
        // Cambiamos router.push por navigation.navigate para mantenernos dentro del AppNavigator
        // y que el ProfileScreen pueda encontrar la ruta 'ChatRoom'
        (navigation as any).navigate('Profile', { userId: profileUserId });
    };

    const hasMedia = item.media && item.media.length > 0;
    const expandTop = 100;
    const muteTop = isModalView ? (expandTop + 44) : 56;

    return (
        <>
            {showTopDivider && (
                <View style={[styles.fullWidthDivider, { marginTop: 0, marginBottom: 12 }]} />
            )}
            <View
                style={hasMedia ? styles.cardWithMedia : styles.cardWithoutMedia}
                onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            >

            {/* ── Header clásico — solo para posts SIN media ── */}
            {!hasMedia && (
                <View style={styles.header} {...(headerPanHandlers || {})}>
                    <TouchableOpacity style={styles.authorRow} onPress={goToProfile} activeOpacity={0.75}>
                        {/* Avatar */}
                        <View style={styles.avatarWrap}>
                            {item.author?.photoUrl ? (
                                <Image source={{ uri: item.author.photoUrl }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarInitials}>
                                    {item.author?.firstName?.[0] || ''}{item.author?.lastName?.[0] || ''}
                                </Text>
                            )}
                        </View>
                        {/* Name + Nickname */}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.authorName} numberOfLines={1}>
                                {item.author?.firstName} {item.author?.lastName}
                            </Text>
                            {item.author?.username && (
                                <Text style={[styles.dateText, { opacity: 0.7 }]}>@{item.author.username}</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onOptionsPress?.(item)}
                        style={styles.moreBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}
            {/* ── Contenido de texto — solo posts SIN media ── */}
            {!hasMedia && (
                <>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onOpenComments?.(item.id, 'comments', true, isTruncatable)}
                        onLongPress={() => setIsCopyModalVisible(true)}
                        delayLongPress={250}
                    >
                        {item.title && (
                            <Text style={styles.postTitle}>{item.title}</Text>
                        )}
                        <Text style={styles.content}>
                            {displayContent}
                            {isTruncatable && !isExpanded && (
                                <Text onPress={() => setIsExpanded(true)} style={styles.verMasLink}>
                                    {' '}... más
                                </Text>
                            )}
                        </Text>
                    </TouchableOpacity>
                    {isTruncatable && isExpanded && (
                        <TouchableOpacity
                            onPress={() => setIsExpanded(false)}
                            style={styles.verMasBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Text style={styles.verMasLink}>Ver menos.</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}


            {/* ── Media Adjunta con overlay de autor ARRIBA (Store style) ── */}
            {hasMedia && (
                <View style={styles.mediaWrapper}>
                    <ImageCarousel
                        media={item.media}
                        onPress={() => onOpenComments?.(item.id, 'comments', true, false)}
                        disableFullscreen={true}
                        isViewable={isViewable}
                        isFocused={isFocused}
                        isOverlayActive={isOverlayActive}
                        containerWidth={cardWidth}
                        customAspectRatio={1080 / 1485}
                        muteButtonStyle={{ top: muteTop, right: 12 }}
                        hidePagination={true}
                        onIndexChange={setActiveIndex}
                        overlay={
                            item.media && item.media.length > 1 && (
                                <View style={styles.bottomActionStrip}>
                                    <View style={styles.integratedCounter}>
                                        <Text style={styles.integratedCounterText}>
                                            {activeIndex + 1} / {item.media.length}
                                        </Text>
                                    </View>
                                </View>
                            )
                        }
                    />

                    {/* Autor overlay — glassmorphism en la esquina SUPERIOR IZQUIERDA */}
                    <TouchableOpacity
                        style={styles.authorOverlay}
                        onPress={goToProfile}
                        activeOpacity={0.85}
                    >
                        <View style={styles.avatarMini}>
                            {item.author?.photoUrl ? (
                                <Image source={{ uri: item.author.photoUrl }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarMiniInitials}>
                                    {item.author?.firstName?.[0] || ''}{item.author?.lastName?.[0] || ''}
                                </Text>
                            )}
                        </View>
                        <View style={styles.overlayTextCol}>
                            <Text style={styles.overlayAuthorName} numberOfLines={1}>
                                {item.author?.firstName} {item.author?.lastName}
                            </Text>
                            {item.author?.username && (
                                <Text style={styles.overlayNickname} numberOfLines={1}>
                                    @{item.author.username}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Botón ⋯ esquina superior derecha */}
                    <TouchableOpacity
                        style={styles.overlayOptionsBtn}
                        onPress={() => onOptionsPress?.(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Acciones Instagram-style — justo debajo de la imagen ── */}
            {hasMedia && (
                <View style={styles.instagramActionsRow}>
                    <TouchableOpacity style={styles.instaBtn} onPress={handleLikePress}>
                        <Feather
                            name="heart"
                            size={22}
                            color={localLiked ? '#FF3B30' : colors.text}
                        />
                        {localCount > 0 && (
                            <Text style={[styles.instaCount, { color: colors.text }]}>{localCount}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.instaBtn}
                        onPress={() => onOpenComments?.(item.id, 'comments', false, false)}
                    >
                        <Feather name="message-circle" size={22} color={colors.text} />
                        {commentsCount > 0 && (
                            <Text style={[styles.instaCount, { color: colors.text }]}>{commentsCount}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Contenido/descripción debajo de los botones ── */}
            {hasMedia && item.content && item.content.trim() !== '' && (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onOpenComments?.(item.id, 'comments', true, isTruncatable)}
                    onLongPress={() => setIsCopyModalVisible(true)}
                    delayLongPress={250}
                    style={styles.belowMediaContent}
                >
                    {item.title && (
                        <Text style={styles.postTitle}>{item.title}</Text>
                    )}
                    <Text style={styles.content}>
                        {displayContent}
                        {isTruncatable && !isExpanded && (
                            <Text onPress={() => setIsExpanded(true)} style={styles.verMasLink}>
                                {' '}... más
                            </Text>
                        )}
                    </Text>
                    {isTruncatable && isExpanded && (
                        <Text onPress={() => setIsExpanded(false)} style={[styles.verMasLink, { marginTop: 4 }]}>
                            Ver menos.
                        </Text>
                    )}
                </TouchableOpacity>
            )}


            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ── Actions (solo posts SIN media) ── */}
            {!hasMedia && (
                <View style={styles.instagramActionsRow}>
                    {/* Like */}
                    <TouchableOpacity
                        style={styles.instaBtn}
                        onPress={handleLikePress}
                        activeOpacity={0.7}
                    >
                        <Feather
                            name="heart"
                            size={22}
                            color={localLiked ? '#FF3B30' : colors.text}
                        />
                        {localCount > 0 && (
                            <Text style={[styles.instaCount, { color: colors.text }]}>
                                {localCount}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Comentar */}
                    <TouchableOpacity
                        style={styles.instaBtn}
                        onPress={() => onOpenComments?.(item.id, 'comments', false, false)}
                        activeOpacity={0.7}
                    >
                        <Feather name="message-circle" size={22} color={colors.text} />
                        {commentsCount > 0 && (
                            <Text style={[styles.instaCount, { color: colors.text }]}>{commentsCount}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Fecha al final (para todos los posts) */}
            <Text style={[styles.postDateBottom, { color: colors.textSecondary }]}>
                {formatDate(item.createdAt)}{isEdited ? ' · Editado' : ''}
            </Text>
            <CopyTextModal
                visible={isCopyModalVisible}
                textToCopy={displayContent}
                onClose={() => setIsCopyModalVisible(false)}
            />
            <ReportModal
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                reportedItemId={item.id}
                reportedItemType="POST"
                onContentDeleted={() => {
                    client.cache.evict({ id: client.cache.identify({ __typename: 'Post', id: item.id }) });
                    client.cache.gc();
                    setReportVisible(false);
                }}
            />
        </View>
    </>
);
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    cardWithoutMedia: {
        backgroundColor: colors.surface,
        marginVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        paddingTop: 14,
        paddingBottom: 4,
        ...Platform.select({
            ios: {
                shadowColor: isDark ? '#000' : '#00000022',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: isDark ? 6 : 3,
            },
        }),
    },
    cardWithMedia: {
        backgroundColor: colors.surface,
        marginVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        paddingTop: 0,
        paddingBottom: 4,
        ...Platform.select({
            ios: {
                shadowColor: isDark ? '#000' : '#00000022',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: isDark ? 6 : 3,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
        justifyContent: 'space-between',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: {
        color: colors.textSecondary,
        fontWeight: '700',
        fontSize: 15,
        textTransform: 'uppercase',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorName: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 15,
        flexShrink: 1,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    dot: {
        color: colors.textSecondary,
        marginHorizontal: 4,
        fontSize: 13,
    },
    dateText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    editedBadge: {
        color: colors.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    moreBtn: {
        padding: 4,
        marginLeft: 8,
    },
    postTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        marginBottom: 6,
    },
    content: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 23,
        paddingHorizontal: 16,
        marginBottom: 4,
    },
    verMas: {
        color: colors.text,
        fontSize: 15,
    },
    verMasBtn: {
        paddingHorizontal: 16,
        paddingVertical: 2,
        marginBottom: 10,
    },
    verMasLink: {
        color: '#1877F2',
        fontWeight: '500',
        fontSize: 14,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 14,
        marginBottom: 2,
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionCount: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 5,
    },
    // ── Instagram-style actions (posts con media) ──
    instagramActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 2,
        gap: 18,
    },
    instaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    instaCount: {
        fontSize: 15,
        fontWeight: '700',
    },
    mediaContainer: {
        width: '100%',
        marginTop: 6,
        marginBottom: 8,
    },
    mediaPlaceholder: {
        width: '100%',
        height: 300,
        backgroundColor: colors.surface,
    },
    // ── Overlay store-style ──
    mediaWrapper: {
        width: '100%',
        position: 'relative',
        backgroundColor: '#000',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    authorOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        zIndex: 20,
    },
    overlayTextCol: {
        flexDirection: 'column',
        justifyContent: 'center',
        marginLeft: 2,
    },
    avatarMini: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarMiniInitials: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    overlayAuthorName: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        lineHeight: 15,
    },
    overlayNickname: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '600',
    },
    overlayOptionsBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 25,
    },
    belowMediaContent: {
        paddingTop: 4,
        paddingBottom: 4,
    },
    postDateBottom: {
        fontSize: 11,
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 4,
        opacity: 0.5,
    },
    fullWidthDivider: {
        height: 0.6,
        backgroundColor: '#BDBDBD',
        marginTop: 0, 
        marginBottom: 2, 
        width: '120%', 
        marginLeft: -40, 
        opacity: 0.35,
        zIndex: 10,
        elevation: 5,
    },
    bottomActionStrip: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 8,
        alignItems: 'center',
        zIndex: 15,
    },
    integratedCounter: {
        backgroundColor: 'transparent',
    },
    integratedCounterText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
