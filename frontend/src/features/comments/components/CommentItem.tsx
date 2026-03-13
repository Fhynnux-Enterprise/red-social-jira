import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Pressable,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import { TOGGLE_LIKE_COMMENT } from '../graphql/comments.operations';
import { useTheme } from '../../../theme/ThemeContext';

interface CommentItemProps {
    item: any;
    currentUser: any;
    onLongPress: () => void;
    onNavigateToProfile: (userId: string) => void;
}

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

export default function CommentItem({ item, currentUser, onLongPress, onNavigateToProfile }: CommentItemProps) {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);
    const author = item.user;

    // Animación de escala para el corazón
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const [toggleLike] = useMutation(TOGGLE_LIKE_COMMENT, {
        optimisticResponse: {
            toggleCommentLike: {
                __typename: 'Comment',
                id: item.id,
                likesCount: item.isLikedByMe ? item.likesCount - 1 : item.likesCount + 1,
                isLikedByMe: !item.isLikedByMe,
            },
        },
    });

    const handleLike = () => {
        // Disparamos la animación
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.3,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
        ]).start();

        toggleLike({ variables: { commentId: item.id } });
    };

    const isEdited = (() => {
        if (!item.createdAt || !item.updatedAt) return false;
        const created = new Date(item.createdAt).getTime();
        const updated = new Date(item.updatedAt).getTime();
        if (isNaN(created) || isNaN(updated)) return false;
        return updated - created > 2000;
    })();

    return (
        <Pressable
            onLongPress={onLongPress}
            delayLongPress={250}
            style={({ pressed }) => [
                styles.commentCard,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent', borderRadius: 8, padding: 4 },
            ]}
        >
            <View style={styles.avatarPlaceholder}>
                <TouchableOpacity
                    onPress={() => author?.id && onNavigateToProfile(author.id)}
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
                <TouchableOpacity onPress={() => author?.id && onNavigateToProfile(author.id)} activeOpacity={0.7}>
                    <Text style={[styles.authorName, { color: colors.textSecondary }]}>
                        {author?.firstName} {author?.lastName}
                    </Text>
                </TouchableOpacity>
                <Text style={[styles.textContent, { color: colors.text }]}>{item.content}</Text>
                
                <View style={styles.commentFooter}>
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        {formatTimeAgo(new Date(item.createdAt))}
                        {isEdited && <Text style={{ fontStyle: 'italic' }}> • Editado</Text>}
                    </Text>

                    <TouchableOpacity style={styles.footerAction}>
                        <Text style={[styles.replyText, { color: colors.textSecondary }]}>Responder</Text>
                    </TouchableOpacity>

                    {/* Nuevo contenedor de Like alineado en el footer */}
                    <TouchableOpacity 
                        style={styles.likeAction} 
                        onPress={handleLike}
                        activeOpacity={0.6}
                    >
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <Ionicons 
                                name={item.isLikedByMe ? "heart" : "heart-outline"} 
                                size={17} 
                                color={item.isLikedByMe ? "#FF3B30" : colors.textSecondary} 
                            />
                        </Animated.View>
                        {item.likesCount > 0 && (
                            <Text style={[styles.likesCountText, { color: item.isLikedByMe ? "#FF3B30" : colors.textSecondary, fontWeight: item.isLikedByMe ? 'bold' : 'normal' }]}>
                                {item.likesCount}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Pressable>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    commentCard: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
    avatarPlaceholder: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255, 101, 36, 0.15)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 10,
        borderWidth: 1, borderColor: 'rgba(255, 101, 36, 0.3)',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: '#FF6524', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
    commentContent: { flex: 1, marginRight: 8 },
    commentFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    footerAction: { marginLeft: 16 },
    replyText: { fontSize: 12, fontWeight: 'bold' },
    likeAction: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginLeft: 16,
        minHeight: 20
    },
    likesCountText: { fontSize: 12, marginLeft: 4 },
    authorName: { fontWeight: 'bold', fontSize: 13, marginBottom: 2, marginTop: Platform.OS === 'android' ? -2 : 0 },
    dateText: { fontSize: 12 },
    textContent: { fontSize: 14, lineHeight: 20 },
});
