import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Platform,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { AppStackParamList } from '../../../navigation/AppNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_CONVERSATION, DELETE_CONVERSATION_FOR_ME, GET_USER_CONVERSATIONS, GET_CHAT_MEDIA } from '../graphql/chat.operations';
import Toast from 'react-native-toast-message';
import { VideoView, useVideoPlayer } from 'expo-video';
import ZoomableImageViewer from '../../feed/components/ZoomableImageViewer';
import { InteractiveVideoPlayer } from '../../feed/components/ImageCarousel';
import { BLOCK_USER, UNBLOCK_USER } from '../../user-blocks/graphql/user-blocks.operations';
import { Dimensions, FlatList, Animated } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatDetailsScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<any>();
    const localParams = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const params = route.params || localParams || {};
    const { conversationId } = params;
    const { user: currentUser } = useAuth() as any;
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [isBlockConfirmVisible, setIsBlockConfirmVisible] = useState(false);
    
    // Estados para el visor multimedia
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerActiveIndex, setViewerActiveIndex] = useState(0);
    const viewerTranslateY = React.useRef(new Animated.Value(0)).current;
    const viewerBgOpacity = viewerTranslateY.interpolate({
        inputRange: [-SCREEN_HEIGHT, 0, SCREEN_HEIGHT],
        outputRange: [0, 1, 0]
    });

    const { data, loading, refetch } = useQuery<any>(GET_CONVERSATION, {
        variables: { conversationId },
        skip: !conversationId,
    });

    const { data: mediaData, loading: loadingMedia } = useQuery<any>(GET_CHAT_MEDIA, {
        variables: { conversationId },
        skip: !conversationId,
    });

    const isBlocked = useMemo(() => data?.getConversation?.isBlocked, [data]);

    const otherUser = useMemo(() => {
        const participants = data?.getConversation?.participants;
        return participants?.find((p: any) => p.user.id !== currentUser?.id)?.user || null;
    }, [data, currentUser?.id]);

    const client = useApolloClient();
    const [deleteConversationForMeMutation] = useMutation(DELETE_CONVERSATION_FOR_ME);

    const handleDeleteChat = () => {
        setIsConfirmModalVisible(true);
    };

    const [blockUser, { loading: blocking }] = useMutation(BLOCK_USER, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Usuario bloqueado' });
            refetch();
            setIsBlockConfirmVisible(false);
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const [unblockUser, { loading: unblocking }] = useMutation(UNBLOCK_USER, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Usuario desbloqueado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const handleBlockAction = () => {
        if (isBlocked) {
            unblockUser({ variables: { userId: otherUser.id } });
        } else {
            setIsBlockConfirmVisible(true);
        }
    };

    const confirmBlockUser = () => {
        blockUser({ variables: { userId: otherUser.id } });
    };

    const handleConfirmDelete = async () => {
        setIsConfirmModalVisible(false);
        try {
            await deleteConversationForMeMutation({ 
                variables: { conversationId },
                refetchQueries: [{ query: GET_USER_CONVERSATIONS }]
            });
            client.cache.evict({ id: `Conversation:${conversationId}` });
            client.cache.gc();
            router.push({
                pathname: '/(tabs)/chatList'
            });
        } catch (err) {
            console.error("Error al eliminar conversación:", err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar la conversación.' });
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Image 
                    source={require('../../../../assets/images/icon.png')} 
                    style={{ width: 40, height: 40, opacity: 0.5 }} 
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Información</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {otherUser?.photoUrl ? (
                            <Image source={{ uri: otherUser.photoUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                    {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.name, { color: colors.text }]}>
                        {otherUser?.firstName} {otherUser?.lastName}
                    </Text>
                    <Text style={[styles.username, { color: colors.textSecondary }]}>
                        @{otherUser?.username}
                    </Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.surface, opacity: isBlocked ? 0.5 : 1 }]}
                        onPress={() => {
                            if (isBlocked) {
                                Toast.show({
                                    type: 'info',
                                    text1: 'Acceso restringido',
                                    text2: 'No puedes ver este perfil.'
                                });
                                return;
                            }
                            router.push({
                                pathname: '/profile',
                                params: { userId: otherUser.id }
                            });
                        }}
                    >
                        <Ionicons name="person" size={24} color={isBlocked ? colors.textSecondary : colors.primary} />
                        <Text style={[styles.actionLabel, { color: isBlocked ? colors.textSecondary : colors.text }]}>Perfil</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                        <Ionicons name="notifications" size={24} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Silenciar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                        onPress={() => router.push({
                            pathname: '/chatRoom',
                            params: { conversationId, activateSearch: true }
                        })}
                    >
                        <Ionicons name="search" size={24} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Buscar</Text>
                    </TouchableOpacity>
                </View>

                {/* Multimedia */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                Multimedia ({mediaData?.getChatMedia?.length || 0})
                            </Text>
                        </View>
                    </View>
                    
                    {mediaData?.getChatMedia?.length > 0 ? (
                        <FlatList 
                            data={mediaData.getChatMedia}
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.mediaScroll}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item: msg, index }) => (
                                <TouchableOpacity 
                                    style={styles.mediaItem}
                                    onPress={() => {
                                        setViewerActiveIndex(index);
                                        setViewerVisible(true);
                                    }}
                                >
                                    {msg.videoUrl ? (
                                        <ChatMediaThumbnail url={msg.videoUrl} />
                                    ) : (
                                        <Image 
                                            source={{ uri: msg.imageUrl }} 
                                            style={styles.mediaThumbnail} 
                                        />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View style={styles.emptyMediaContainer}>
                            <Ionicons name="image-outline" size={32} color={colors.textSecondary} style={{ marginBottom: 8, opacity: 0.5 }} />
                            <Text style={[styles.emptyMediaText, { color: colors.textSecondary }]}>
                                {loadingMedia ? 'Cargando multimedia...' : 'Aún no existen archivos multimedia compartidos.'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Options List */}
                <View style={[styles.optionsList, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity 
                        style={styles.optionItem}
                        onPress={handleDeleteChat}
                    >
                        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                        <Text style={[styles.optionText, { color: '#FF3B30' }]}>Eliminar conversación</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.optionItem, { borderBottomWidth: 0 }]}
                        onPress={handleBlockAction}
                        disabled={blocking || unblocking}
                    >
                        <Ionicons 
                            name={isBlocked ? "shield-checkmark-outline" : "shield-outline"} 
                            size={22} 
                            color={isBlocked ? colors.primary : "#FF3B30"} 
                        />
                        <Text style={[styles.optionText, { color: isBlocked ? colors.primary : "#FF3B30" }]}>
                            {isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal de Confirmación Estilizado */}
            <Modal
                visible={isConfirmModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsConfirmModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.confirmModalContainer, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.confirmModalTitle, { color: colors.text }]}>Eliminar conversación</Text>
                        <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                            ¿Estás seguro de que deseas eliminar esta conversación? Esta acción se aplicará solo para ti.
                        </Text>
                        
                        <View style={[styles.confirmModalActions, { borderTopColor: colors.border }]}>
                            <TouchableOpacity 
                                style={[styles.confirmModalBtn, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border }]}
                                onPress={() => setIsConfirmModalVisible(false)}
                            >
                                <Text style={[styles.confirmModalBtnText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.confirmModalBtn}
                                onPress={handleConfirmDelete}
                            >
                                <Text style={[styles.confirmModalBtnText, { color: '#FF3B30', fontWeight: 'bold' }]}>
                                    Eliminar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            <Modal
                visible={isBlockConfirmVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsBlockConfirmVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.confirmModalContainer, { backgroundColor: colors.surface }]}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF3B3015', justifyContent: 'center', alignItems: 'center', marginBottom: 15, marginTop: 10 }}>
                            <Ionicons name="shield-outline" size={40} color="#FF3B30" />
                        </View>
                        <Text style={[styles.confirmModalTitle, { color: colors.text }]}>¿Bloquear a {otherUser?.firstName}?</Text>
                        <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                            No podrán enviarse mensajes ni ver sus perfiles mutuamente. Podrás desbloquearlo después desde Configuración.
                        </Text>
                        
                        <View style={[styles.confirmModalActions, { borderTopColor: colors.border }]}>
                            <TouchableOpacity 
                                style={[styles.confirmModalBtn, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border }]}
                                onPress={() => setIsBlockConfirmVisible(false)}
                            >
                                <Text style={[styles.confirmModalBtnText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.confirmModalBtn}
                                onPress={confirmBlockUser}
                                disabled={blocking}
                            >
                                {blocking ? (
                                    <ActivityIndicator size="small" color="#FF3B30" />
                                ) : (
                                    <Text style={[styles.confirmModalBtnText, { color: '#FF3B30', fontWeight: 'bold' }]}>
                                        Bloquear
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Visor Multimedia a Pantalla Completa */}
            <Modal 
                visible={viewerVisible} 
                transparent 
                animationType="fade"
                onRequestClose={() => setViewerVisible(false)}
            >
                <Animated.View style={[styles.viewerContainer, { opacity: viewerBgOpacity }]}>
                    <TouchableOpacity
                        style={[styles.closeViewerButton, { top: insets.top + 20 }]}
                        onPress={() => setViewerVisible(false)}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <FlatList
                        data={mediaData?.getChatMedia || []}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={viewerActiveIndex}
                        getItemLayout={(_, index) => ({
                            length: SCREEN_WIDTH,
                            offset: SCREEN_WIDTH * index,
                            index,
                        })}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        onMomentumScrollEnd={(event) => {
                            const xOffset = event.nativeEvent.contentOffset.x;
                            const index = Math.round(xOffset / SCREEN_WIDTH);
                            setViewerActiveIndex(index);
                        }}
                        renderItem={({ item, index }) => (
                            <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', backgroundColor: 'transparent' }}>
                                {item.videoUrl ? (
                                    <InteractiveVideoPlayer
                                        url={item.videoUrl}
                                        width={SCREEN_WIDTH}
                                        height={SCREEN_HEIGHT}
                                        isMuted={false}
                                        shouldPlay={viewerActiveIndex === index && viewerVisible}
                                        toggleMute={() => {}}
                                        isInteractive={true}
                                        hideExpand={true}
                                        contentFit="contain"
                                        insets={insets}
                                    />
                                ) : (
                                    <ZoomableImageViewer 
                                        url={item.imageUrl}
                                        onClose={() => setViewerVisible(false)}
                                    />
                                )}
                            </View>
                        )}
                    />
                </Animated.View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        height: 60,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingVertical: 20,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    actionBtn: {
        width: 80,
        height: 70,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    actionLabel: {
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptyMediaContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyMediaText: {
        fontSize: 14,
        textAlign: 'center',
    },
    mediaScroll: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    mediaItem: {
        width: 100,
        height: 100,
        marginRight: 10,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    mediaThumbnail: {
        width: '100%',
        height: '100%',
    },
    videoThumbnailContainer: {
        flex: 1,
        position: 'relative',
    },
    videoPlayOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsList: {
        marginHorizontal: 20,
        borderRadius: 20,
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionText: {
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmModalContainer: {
        width: '80%',
        borderRadius: 20,
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    confirmModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    confirmModalMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    confirmModalActions: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
        width: '100%',
    },
    confirmModalBtn: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmModalBtnText: {
        fontSize: 16,
        fontWeight: '500',
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    closeViewerButton: {
        position: 'absolute',
        right: 16,
        zIndex: 100,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
});

/**
 * Componente para miniaturas de video visuales.
 * Muestra el primer frame del video.
 */
const ChatMediaThumbnail = ({ url }: { url: string }) => {
    const player = useVideoPlayer(url, (p) => {
        p.muted = true;
        p.loop = true;
        p.pause(); // Mantener pausado, solo queremos el frame inicial
    });

    return (
        <View style={styles.videoThumbnailContainer}>
            <VideoView
                player={player}
                style={styles.mediaThumbnail}
                contentFit="cover"
                nativeControls={false}
            />
            <View style={styles.videoPlayOverlay}>
                <Ionicons name="play" size={20} color="#FFF" />
            </View>
        </View>
    );
};
