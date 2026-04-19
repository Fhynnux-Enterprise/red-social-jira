import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    Modal,
    Animated,
    PanResponder,
    Dimensions,
    TouchableWithoutFeedback,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_BLOCKED_USERS, UNBLOCK_USER } from '../graphql/user-blocks.operations';
import { useTheme } from '../../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_SIZE = 20;

interface BlockedUsersModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function BlockedUsersModal({ visible, onClose }: BlockedUsersModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [scrollOffset, setScrollOffset] = useState(0);

    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const closeWithAnimation = () => {
        Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 260,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const resetPosition = Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
    });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => {
                return g.dy > 10 && scrollOffset <= 5;
            },
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) panY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 150 || g.vy > 0.8) closeWithAnimation();
                else resetPosition.start();
            },
            onPanResponderTerminate: () => resetPosition.start()
        })
    ).current;

    const dragPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) panY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 120 || g.vy > 0.7) closeWithAnimation();
                else resetPosition.start();
            }
        })
    ).current;

    useEffect(() => {
        if (visible) {
            panY.setValue(SCREEN_HEIGHT);
            Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 14,
            }).start();
        }
    }, [visible]);

    const { data, loading, error, refetch, fetchMore } = useQuery(GET_MY_BLOCKED_USERS, {
        variables: { limit: PAGE_SIZE, offset: 0 },
        skip: !visible,
        fetchPolicy: 'cache-and-network',
        onCompleted: (res) => {
            if (res?.getMyBlockedUsers?.length < PAGE_SIZE) {
                setHasMore(false);
            }
        }
    });

    const loadMore = async () => {
        if (!hasMore || isFetchingMore || loading) return;
        setIsFetchingMore(true);
        try {
            const currentCount = data?.getMyBlockedUsers?.length || 0;
            const { data: moreData } = await fetchMore({
                variables: { offset: currentCount },
            });
            if (moreData?.getMyBlockedUsers?.length < PAGE_SIZE) {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more blocked users:', error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    const [unblockUser, { loading: unblocking }] = useMutation(UNBLOCK_USER, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Usuario desbloqueado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.item, { borderBottomColor: colors.border }]}>
            <View {...dragPanResponder.panHandlers} style={styles.userInfo}>
                {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                            {item.firstName?.[0]}{item.lastName?.[0]}
                        </Text>
                    </View>
                )}
                <View style={styles.textInfo}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
                    <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
                </View>
            </View>
            
            <TouchableOpacity 
                style={[styles.unblockBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
                onPress={() => unblockUser({ variables: { userId: item.id } })}
                disabled={unblocking}
            >
                {unblocking ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <Text style={[styles.unblockBtnText, { color: colors.primary }]}>Desbloquear</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeWithAnimation}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={closeWithAnimation}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>

                <Animated.View 
                    style={[
                        styles.container, 
                        { 
                            backgroundColor: colors.background,
                            transform: [{ translateY: panY }],
                            paddingBottom: insets.bottom
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View {...dragPanResponder.panHandlers} style={styles.headerArea}>
                        <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                        <View style={styles.headerTitleRow}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>Usuarios Bloqueados</Text>
                            <TouchableOpacity onPress={closeWithAnimation} style={styles.closeIcon}>
                                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading && !data ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : error ? (
                        <View {...dragPanResponder.panHandlers} style={styles.center}>
                            <View style={[styles.errorCircle, { backgroundColor: colors.error + '10' }]}>
                                <Ionicons name="cloud-offline-outline" size={40} color={colors.error} />
                            </View>
                            <Text style={[styles.errorTitle, { color: colors.text }]}>No hay conexión</Text>
                            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                                No pudimos cargar la lista. Verifica tu internet.
                            </Text>
                            <TouchableOpacity 
                                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                                onPress={() => refetch()}
                            >
                                <Ionicons name="refresh" size={20} color="white" />
                                <Text style={styles.retryBtnText}>Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={data?.getMyBlockedUsers}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                            onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.y)}
                            scrollEventThrottle={16}
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.5}
                            ListEmptyComponent={
                                <View {...dragPanResponder.panHandlers} style={styles.emptyContainer}>
                                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
                                        <Ionicons name="shield-checkmark-outline" size={40} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Tu lista de bloqueados está vacía</Text>
                                </View>
                            }
                            ListFooterComponent={
                                <>
                                    {isFetchingMore && (
                                        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
                                    )}
                                    <View {...dragPanResponder.panHandlers} style={styles.dragFooter} />
                                </>
                            }
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        height: '85%',
        width: '100%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            }
        }),
    },
    headerArea: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 15,
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        marginBottom: 15,
        opacity: 0.5,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeIcon: {
        position: 'absolute',
        right: 15,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
        opacity: 0.8,
    },
    errorCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.7,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    retryBtnText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexGrow: 1,
    },
    dragFooter: {
        flex: 1,
        minHeight: 500,
        backgroundColor: 'transparent',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 10,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    textInfo: {
        marginLeft: 12,
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
    },
    username: {
        fontSize: 13,
        opacity: 0.6,
    },
    unblockBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 110,
        alignItems: 'center',
    },
    unblockBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
});
