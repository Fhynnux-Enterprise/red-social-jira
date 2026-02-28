import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { GET_POSTS } from '../graphql/posts.operations';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import CreatePostModal from '../components/CreatePostModal';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';

export default function FeedScreen() {
    const { signOut } = useAuth();
    const { colors } = useTheme();
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Generamos estilos dinámicos que reaccionan al tema
    const styles = useMemo(() => getStyles(colors), [colors]);

    const { data, loading, error, refetch } = useQuery(GET_POSTS);

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

    const renderPost = ({ item }: { item: any }) => (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
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
                    <Text style={styles.postDate}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>
            </View>
            <Text style={styles.postContent}>{item.content}</Text>

            <View style={styles.postFooter}>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Me gusta</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Comentar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            {/* Cabecera Tipo Facebook */}
            <View style={styles.topHeader}>
                <View style={styles.brandContainer}>
                    <Image
                        source={require('../../../../assets/images/logo-palido-transparente.png')}
                        style={styles.brandLogo}
                    />
                    <MaskedView
                        style={{ flexDirection: 'row' }}
                        maskElement={
                            <View style={{ backgroundColor: 'transparent', flex: 1, justifyContent: 'center' }}>
                                <Text style={styles.brandTitle}>Chunchi City</Text>
                            </View>
                        }
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={[styles.brandTitle, { opacity: 0 }]}>Chunchi City</Text>
                        </LinearGradient>
                    </MaskedView>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="search-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Input "Crear Publicación" Estilo Facebook */}
            <View style={styles.createPostContainer}>
                <View style={styles.createPostRow}>
                    <View style={styles.smallAvatarPlaceholder}>
                        <Ionicons name="person" size={20} color={colors.textSecondary} />
                    </View>
                    <TouchableOpacity
                        style={styles.fakeInput}
                        activeOpacity={0.7}
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Text style={styles.fakeInputText}>¿Qué está pasando en Chunchi?</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : error ? (
                <Text style={styles.errorText}>No se pudieron cargar los posts.</Text>
            ) : (
                <FlatList
                    data={data?.getPosts || []}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPost}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={refetch}
                />
            )}

            {/* Modal para Crear Publicación */}
            <CreatePostModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandLogo: {
        width: 34,
        height: 34,
        marginRight: 12,
        borderRadius: 1,
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: '900', // <-- AQUÍ CAMBIAS EL GROSOR ('bold', 'normal', '100' hasta '900')
        fontFamily: '', // <-- AQUÍ CAMBIAS EL TIPO DE LETRA (Ej en Android: 'sans-serif', 'sans-serif-condensed', 'serif')
        letterSpacing: 1,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createPostContainer: {
        padding: 16,
        borderBottomWidth: 6,
        borderBottomColor: colors.surface,
    },
    createPostRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    smallAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fakeInput: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 20,
        paddingHorizontal: 16,
        justifyContent: 'center',
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fakeInputText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    listContainer: {
        paddingBottom: 24,
        paddingTop: 8,
    },
    loader: {
        marginTop: 40,
    },
    errorText: {
        color: colors.error,
        textAlign: 'center',
        marginTop: 40,
    },
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
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 101, 36, 0.15)', // Un fondo sutil primario
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
    postDate: {
        color: colors.textSecondary,
        fontSize: 13,
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
