import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useMutation, useApolloClient } from '@apollo/client/react';
import { TOGGLE_LIKE } from '../graphql/posts.operations';
import { DIRECT_MODERATE_CONTENT } from '../../moderation/graphql/moderation.operations';
import CopyTextModal from '../../../components/CopyTextModal';
import ImageCarousel from './ImageCarousel';
import { Dimensions } from 'react-native';
import ReportModal from '../../reports/components/ReportModal';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 4;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);

const MAX_CHARS = 125;

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
}: PostCardProps) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const router = useRouter();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const authContext = useAuth() as any;
    const userId = authContext.user?.id || currentUserId;

    const isEdited = item.updatedAt && new Date(item.updatedAt).getTime() > new Date(item.createdAt).getTime() + 2000;

    const displayCount = item.likes?.length || 0;
    const commentsCount = item.commentsCount ?? item.comments?.length ?? 0;
    const displayLiked = item.likes?.some((like: any) => like.user?.id === userId) || false;

    const [localCount, setLocalCount] = useState<number>(displayCount);
    const [localLiked, setLocalLiked] = useState<boolean>(displayLiked);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);

    const isModeratorOrAdmin = authContext.user?.role === 'ADMIN' || authContext.user?.role === 'MODERATOR';
    const [directModerateVisible, setDirectModerateVisible] = useState(false);
    const [directModerateNote, setDirectModerateNote] = useState('');
    const client = useApolloClient();

    const [directModerateMutation, { loading: filtering }] = useMutation(DIRECT_MODERATE_CONTENT, {
        onCompleted: () => {
            client.cache.evict({ id: client.cache.identify({ __typename: 'Post', id: item.id }) });
            client.cache.gc();
            setDirectModerateVisible(false);
            setDirectModerateNote('');
            Toast.show({ type: 'success', text1: 'Contenido Moderado', text2: 'La publicación ha sido eliminada y registrada.' });
        },
        onError: (err) => {
            Alert.alert('Error', err.message);
        }
    });

    const handleDirectModerate = () => {
        directModerateMutation({
            variables: {
                input: {
                    reportedItemId: item.id,
                    reportedItemType: 'POST',
                    moderatorNote: directModerateNote.trim() || undefined
                }
            }
        });
    };

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
                {/* Botones para no-dueños */}
                {item.author.id !== userId && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isModeratorOrAdmin && (
                            <TouchableOpacity
                                onPress={() => setDirectModerateVisible(true)}
                                style={[styles.moreBtn, { marginRight: 8 }]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="shield-checkmark-outline" size={18} color="#F44336" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => setReportVisible(true)}
                            style={styles.moreBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* ── Contenido ── */}
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
                        <Text 
                            onPress={() => setIsExpanded(true)} 
                            style={styles.verMasLink}
                        >
                             ... más
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

            {/* ── Media Adjunta ── */}
            {item.media && item.media.length > 0 && (
                <View style={{ marginTop: 6 }}>
                    <ImageCarousel
                        media={item.media}
                        onPress={() => onOpenComments?.(item.id, 'comments', true, false)}
                        disableFullscreen={true}
                        isViewable={isViewable}
                        isFocused={isFocused}
                        isOverlayActive={isOverlayActive}
                        containerWidth={CARD_WIDTH}
                        customAspectRatio={1080 / 1485}
                    />
                </View>
            )}

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ── Actions + stats ── */}
            <View style={styles.actionsRow}>
                {/* Like */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleLikePress}
                    activeOpacity={0.7}
                >
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
                    onPress={() => onOpenComments?.(item.id, 'comments', false, false)}
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
            <ReportModal
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                reportedItemId={item.id}
                reportedItemType="POST"
            />
            {/* Direct Moderate Modal */}
            <Modal
                visible={directModerateVisible}
                transparent
                animationType="fade"
                onRequestClose={() => { if (!filtering) setDirectModerateVisible(false) }}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                            <Ionicons name="shield-checkmark" size={24} color="#F44336" style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Moderación Directa</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, marginBottom: 15, fontSize: 14 }}>
                            Esta publicación será eliminada del sistema y se generará un reporte automático en estado Resuelto.
                        </Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5', color: colors.text, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 }}
                            placeholder="Añadir nota de moderador (opcional)..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            maxLength={500}
                            value={directModerateNote}
                            onChangeText={setDirectModerateNote}
                            editable={!filtering}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                            <TouchableOpacity onPress={() => setDirectModerateVisible(false)} disabled={filtering} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDirectModerate} disabled={filtering} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F44336', flexDirection: 'row', alignItems: 'center' }}>
                                {filtering ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '600' }}>Eliminar Post</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        marginHorizontal: 4,
        marginVertical: 6,
        borderRadius: 16,
        paddingTop: 14,
        paddingBottom: 4,
        overflow: 'hidden', // CRÍTICO: Evita que el carrusel se desborde del recuadro
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
    mediaContainer: {
        width: '100%',
        marginTop: 6,
        marginBottom: 8,
    },
    mediaPlaceholder: {
        width: '100%',
        height: 300,
        backgroundColor: colors.surface,
    }
});
