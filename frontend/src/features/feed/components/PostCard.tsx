import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useMutation } from '@apollo/client';
import { TOGGLE_LIKE } from '../graphql/posts.operations';

const MAX_CHARS = 220;

export interface PostCardProps {
    item: any;
    currentUserId?: string;
    onOptionsPress?: (post: any) => void;
    onOpenComments?: (postId: string) => void;
    isModalView?: boolean;
    headerPanHandlers?: any;
    onScroll?: (event: any) => void;
}

export default function PostCard({ item, currentUserId, onOptionsPress, onOpenComments, isModalView, headerPanHandlers }: PostCardProps) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const authContext = useAuth() as any;
    const userId = authContext.user?.id || currentUserId;

    const isEdited = item.updatedAt && new Date(item.updatedAt).getTime() > new Date(item.createdAt).getTime() + 2000;

    const displayCount = item.likes?.length || 0;
    const commentsCount = item.comments?.length || 0;
    const displayLiked = item.likes?.some((like: any) => like.user?.id === userId) || false;

    const [localCount, setLocalCount] = useState<number>(displayCount);
    const [localLiked, setLocalLiked] = useState<boolean>(displayLiked);

    // "Ver más" — confiable: comparación de longitud de caracteres
    const isTruncatable = !isModalView && item.content?.length > MAX_CHARS;

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
            optimisticLikes.push({ __typename: 'PostLike', id: `temp-${Date.now()}`, user: { __typename: 'User', id: userId } });
        }

        toggleLikeMutation({
            variables: { postId: item.id },
            optimisticResponse: {
                toggleLike: {
                    __typename: 'Post',
                    id: item.id,
                    likes: optimisticLikes,
                    comments: item.comments || [],
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
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1) return 'ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    };

    const goToProfile = () => {
        (navigation.navigate as any)('Profile', {
            userId: item.author.id === userId ? undefined : item.author.id,
        });
    };

    const content = item.content || '';
    const truncatedContent = isTruncatable ? content.slice(0, MAX_CHARS).trimEnd() : content;

    return (
        <View style={styles.card}>
            {/* ── Header ── */}
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
                    {/* Name + date */}
                    <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                            <Text style={styles.authorName} numberOfLines={1}>
                                {item.author?.firstName} {item.author?.lastName}
                            </Text>
                            <Text style={styles.dot}>·</Text>
                            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                            {isEdited && <Text style={styles.editedBadge}> · editado</Text>}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Options menu */}
                {item.author.id === userId && (
                    <TouchableOpacity
                        onPress={() => onOptionsPress?.(item)}
                        style={styles.moreBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Contenido ── */}
            <Text style={styles.content}>
                {truncatedContent}
                {isTruncatable && (
                    <Text
                        style={styles.verMas}
                        onPress={() => onOpenComments?.(item.id)}
                    >
                        {'... '}
                        <Text style={styles.verMasLink}>ver más</Text>
                    </Text>
                )}
            </Text>

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ── Actions + stats ── */}
            <View style={styles.actionsRow}>
                {/* Like */}
                <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress} activeOpacity={0.7}>
                    <Ionicons
                        name={localLiked ? 'heart' : 'heart-outline'}
                        size={21}
                        color={localLiked ? '#FF3B30' : colors.textSecondary}
                    />
                    {localCount > 0 && (
                        <Text style={[styles.actionCount, localLiked && { color: '#FF3B30' }]}>
                            {localCount}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Comentar */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onOpenComments?.(item.id)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
                    {commentsCount > 0 && (
                        <Text style={styles.actionCount}>{commentsCount}</Text>
                    )}
                </TouchableOpacity>

                {/* Compartir (placeholder) */}
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-redo-outline" size={19} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 16,
        paddingTop: 14,
        paddingBottom: 4,
        // Sombra moderna
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
        paddingHorizontal: 14,
        marginBottom: 10,
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
        backgroundColor: 'rgba(255, 101, 36, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 101, 36, 0.35)',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: {
        color: '#FF6524',
        fontWeight: '700',
        fontSize: 15,
        textTransform: 'uppercase',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
    },
    authorName: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 15,
        flexShrink: 1,
    },
    dot: {
        color: colors.textSecondary,
        marginHorizontal: 4,
        fontSize: 13,
    },
    dateText: {
        color: colors.textSecondary,
        fontSize: 13,
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
    content: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 23,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    verMas: {
        color: colors.text,
        fontSize: 15,
    },
    verMasLink: {
        color: '#1877F2',
        fontWeight: '500',
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
});
