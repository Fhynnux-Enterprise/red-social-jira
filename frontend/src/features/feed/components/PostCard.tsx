import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useMutation } from '@apollo/client';
import { TOGGLE_LIKE } from '../graphql/posts.operations';

export interface PostCardProps {
    item: any;
    currentUserId?: string;
    onOptionsPress: (item: any) => void;
}

export default function PostCard({ item, currentUserId, onOptionsPress }: PostCardProps) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    // Ojo: Si useAuth() no devuelve 'user', usamos currentUserId como respaldo seguro
    const authContext = useAuth() as any;
    const userId = authContext.user?.id || currentUserId;

    const isEdited = item.updatedAt && new Date(item.updatedAt).getTime() > new Date(item.createdAt).getTime() + 2000;

    const displayCount = item.likes?.length || 0;
    const displayLiked = item.likes?.some((like: any) => like.user?.id === userId) || false;

    // Motor 1: Reacción Visual Inmediata (0ms)
    const [localCount, setLocalCount] = useState<number>(displayCount);
    const [localLiked, setLocalLiked] = useState<boolean>(displayLiked);

    useEffect(() => {
        // Sincronizar el motor local si Apollo Cache recibe actualizaciones en 2do plano
        setLocalCount(displayCount);
        setLocalLiked(displayLiked);
    }, [displayCount, displayLiked]);

    const [toggleLikeMutation] = useMutation(TOGGLE_LIKE);

    const handleLikePress = () => {
        if (!userId) {
            console.warn("No se encontró el userId para dar like");
            return;
        }

        // Reacción en la pantalla en el Acto:
        const nextLiked = !localLiked;
        const nextCount = nextLiked ? localCount + 1 : Math.max(0, localCount - 1);
        setLocalLiked(nextLiked);
        setLocalCount(nextCount);

        // 2. Caché Normalizada instantánea para las otras pantallas (Apollo)
        let optimisticLikes = [...(item.likes || [])];
        if (displayLiked) { // Si antes estaba likeado, lo quitamos de la caché temporal
            optimisticLikes = optimisticLikes.filter((like: any) => like.user?.id !== userId);
        } else {
            // Si antes no estaba likeado, añadimos uno fantasma para la caché temporal
            optimisticLikes.push({
                __typename: 'PostLike',
                id: `temp-${Date.now()}`,
                user: {
                    __typename: 'User',
                    id: userId,
                }
            });
        }

        // 3. Petición en segundo plano al servidor
        toggleLikeMutation({
            variables: { postId: item.id },
            optimisticResponse: {
                toggleLike: {
                    ...item,
                    __typename: 'Post',
                    id: item.id,
                    likes: optimisticLikes,
                }
            }
        }).catch(e => {
            console.error("Error al dar like:", e);
            // Revertir a caché en caso de error
            setLocalLiked(displayLiked);
            setLocalCount(displayCount);
        });
    };

    const formatDate = (isoString: string) => {
        const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
        const date = new Date(utcString);
        const hoy = new Date();
        const ayer = new Date();
        ayer.setDate(hoy.getDate() - 1);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (date.toDateString() === hoy.toDateString()) {
            return `Hoy a las ${timeString}`;
        } else if (date.toDateString() === ayer.toDateString()) {
            return `Ayer a las ${timeString}`;
        } else {
            return `${date.toLocaleDateString()} a las ${timeString}`;
        }
    };

    return (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => (navigation.navigate as any)('Profile', { userId: item.author.id === currentUserId ? undefined : item.author.id })}
                >
                    <View style={[styles.avatarPlaceholder, { overflow: 'hidden' }]}>
                        {item.author.photoUrl ? (
                            <Image source={{ uri: item.author.photoUrl }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {item.author.firstName?.[0] || ''}{item.author.lastName?.[0] || ''}
                            </Text>
                        )}
                    </View>
                    <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>
                            {item.author.firstName} {item.author.lastName}
                        </Text>
                        <View style={styles.postDateContainer}>
                            <Text style={styles.postDate}>
                                {formatDate(item.createdAt)}
                            </Text>
                            {isEdited && (
                                <View style={styles.editedContainer}>
                                    <Text style={styles.editedDot}> </Text>
                                    <Ionicons name="pencil" size={10} color={colors.textSecondary} style={{ marginRight: 2 }} />
                                    <Text style={styles.editedText}> Editado</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
                {item.author.id === currentUserId && (
                    <TouchableOpacity onPress={() => onOptionsPress(item)} style={{ padding: 8, paddingTop: 0, marginLeft: 8, marginTop: -2, alignSelf: 'flex-start' }}>
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.postContent}>{item.content}</Text>

            <View style={styles.postFooter}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLikePress}>
                    <Ionicons
                        name={localLiked ? "heart" : "heart-outline"}
                        size={20}
                        color={localLiked ? "#FF3B30" : colors.textSecondary}
                    />
                    <Text style={[styles.actionText, localLiked && { color: "#FF3B30", fontWeight: 'bold' }]}>
                        {localCount > 0 ? localCount : 'Me gusta'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Comentar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    postCard: {
        backgroundColor: colors.surface,
        padding: 16,
        marginBottom: 8,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 101, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 101, 36, 0.3)',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
        textTransform: 'uppercase',
    },
    authorInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    authorName: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 2,
    },
    postDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postDate: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    editedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 6,
    },
    editedDot: {
        color: colors.textSecondary,
        fontSize: 10,
        marginRight: 4,
        marginTop: -2,
    },
    editedText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    postContent: {
        color: colors.text,
        fontSize: 16,
        lineHeight: 24,
        marginTop: 4,
        marginBottom: 16,
    },
    postFooter: {
        flexDirection: 'row',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
        paddingVertical: 4,
    },
    actionText: {
        color: colors.textSecondary,
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
    },
});
