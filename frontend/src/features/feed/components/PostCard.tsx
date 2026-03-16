import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useMutation } from '@apollo/client';
import { TOGGLE_LIKE } from '../graphql/posts.operations';
import CopyTextModal from '../../../components/CopyTextModal';

const MAX_CHARS = 220;

export interface PostCardProps {
    item: any;
    currentUserId?: string;
    onOptionsPress?: (post: any) => void;
    onOpenComments?: (postId: string, initialTab?: 'comments' | 'likes', minimize?: boolean) => void;
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
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);

    const isTruncatable = !isModalView && (item.content?.length ?? 0) > MAX_CHARS;
    const displayContent = isTruncatable && !isExpanded
        ? item.content.slice(0, MAX_CHARS).trimEnd() + '...'
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
                        <Text style={styles.authorName} numberOfLines={1}>
                            {item.author?.firstName} {item.author?.lastName}
                        </Text>
                        <View style={styles.dateRow}>
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
            <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => onOpenComments?.(item.id, 'comments', true)}
                onLongPress={() => setIsCopyModalVisible(true)}
                delayLongPress={250}
            >
                <Text style={styles.content}>{displayContent}</Text>
            </TouchableOpacity>
            {isTruncatable && !isExpanded && (
                <TouchableOpacity
                    onPress={() => setIsExpanded(true)}
                    style={styles.verMasBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <Text style={styles.verMasLink}>Ver más.</Text>
                </TouchableOpacity>
            )}
            {isTruncatable && isExpanded && (
                <TouchableOpacity
                    onPress={() => setIsExpanded(false)}
                    style={styles.verMasBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <Text style={styles.verMasLink}>Ver menos.</Text>
                </TouchableOpacity>
            )}

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ── Actions + stats ── */}
            <View style={styles.actionsRow}>
                {/* Like */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { paddingRight: 6 }]} 
                        onPress={handleLikePress} 
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={localLiked ? 'heart' : 'heart-outline'}
                            size={21}
                            color={localLiked ? '#FF3B30' : colors.textSecondary}
                        />
                    </TouchableOpacity>
                    {localCount > 0 && (
                        <TouchableOpacity 
                            onPress={() => onOpenComments?.(item.id, 'likes', false)} 
                            activeOpacity={0.7} 
                            style={{ marginLeft: -4, paddingRight: 8, height: 36, justifyContent: 'center' }}
                        >
                            <Text style={[styles.actionCount, { marginLeft: 0 }, localLiked && { color: '#FF3B30' }]}>
                                {localCount}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Comentar */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onOpenComments?.(item.id, 'comments', false)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
                    {commentsCount > 0 && (
                        <Text style={styles.actionCount}>{commentsCount}</Text>
                    )}
                </TouchableOpacity>
            </View>
            <CopyTextModal
                visible={isCopyModalVisible}
                textToCopy={displayContent}
                onClose={() => setIsCopyModalVisible(false)}
            />
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
    content: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 23,
        paddingHorizontal: 14,
        marginBottom: 4,
    },
    verMas: {
        color: colors.text,
        fontSize: 15,
    },
    verMasBtn: {
        paddingHorizontal: 14,
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
});
