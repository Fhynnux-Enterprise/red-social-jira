import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform,
    FlatList, ActivityIndicator, RefreshControl,
    TextInput, Alert, Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import AdminAdsConfig from '../components/AdminAdsConfig';
import AdminUserPermissions from '../components/AdminUserPermissions';
import AdminGlobalNotifications from '../components/AdminGlobalNotifications';
import AdminUserTiers from '../components/AdminUserTiers';
import VerifiedBadge from '../../../components/VerifiedBadge';
import {
    GET_VERIFIED_USERS,
    GET_VERIFICATION_TYPES,
    VERIFY_USER,
    UNVERIFY_USER,
    SEARCH_USERS_FOR_VERIFICATION
} from '../graphql/moderation.operations';

type AdminTab = 'config' | 'users' | 'notifications' | 'verified' | 'tiers';

export default function AdminScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<AdminTab>('config');

    // ── Sección de Cuentas Verificadas ─────────────────────────────────────────
    const [verifiedSearchTerm, setVerifiedSearchTerm] = useState('');
    const [loadingVerifiedMore, setLoadingVerifiedMore] = useState(false);
    const [hasVerifiedMore, setHasVerifiedMore] = useState(true);

    // Tipos de verificado
    const { data: verificationTypesData } = useQuery<any>(GET_VERIFICATION_TYPES, {
        skip: activeTab !== 'verified'
    });
    const verificationTypes = verificationTypesData?.getVerificationTypes || [];

    // Consulta para obtener verificados actuales
    const {
        data: verifiedData,
        loading: verifiedLoading,
        refetch: refetchVerified,
        fetchMore: fetchMoreVerified,
    } = useQuery<any, any>(GET_VERIFIED_USERS, {
        variables: { limit: 15, offset: 0, searchTerm: verifiedSearchTerm },
        skip: activeTab !== 'verified' || verifiedSearchTerm.length > 0,
        fetchPolicy: 'cache-and-network',
    });

    useEffect(() => {
        if (verifiedData?.getVerifiedUsers) {
            if (verifiedData.getVerifiedUsers.length < 15) {
                setHasVerifiedMore(false);
            } else {
                setHasVerifiedMore(true);
            }
        }
    }, [verifiedData]);

    const verifiedUsers: any[] = verifiedData?.getVerifiedUsers || [];

    // Búsqueda global de usuarios para verificar
    const [searchAllUsers, { data: searchAllData, loading: searchAllLoading }] = useLazyQuery<any>(SEARCH_USERS_FOR_VERIFICATION, {
        fetchPolicy: 'network-only'
    });

    const searchAllResults: any[] = searchAllData?.searchUsers || [];

    // Debounce para búsqueda
    useEffect(() => {
        if (activeTab === 'verified' && verifiedSearchTerm.length > 0) {
            const delayDebounce = setTimeout(() => {
                searchAllUsers({ variables: { searchTerm: verifiedSearchTerm, limit: 20 } });
            }, 300);
            return () => clearTimeout(delayDebounce);
        }
    }, [verifiedSearchTerm, activeTab]);

    const handleLoadMoreVerified = () => {
        if (loadingVerifiedMore || !hasVerifiedMore || verifiedLoading || verifiedSearchTerm.length > 0) return;
        setLoadingVerifiedMore(true);
        fetchMoreVerified({
            variables: { offset: verifiedUsers.length, searchTerm: verifiedSearchTerm },
            updateQuery: (prev: any, { fetchMoreResult }: any) => {
                if (!fetchMoreResult || fetchMoreResult.getVerifiedUsers.length === 0) {
                    setHasVerifiedMore(false);
                    return prev;
                }
                if (fetchMoreResult.getVerifiedUsers.length < 15) {
                    setHasVerifiedMore(false);
                }
                const newItems = fetchMoreResult.getVerifiedUsers.filter(
                    (newItem: any) => !prev.getVerifiedUsers.some((prevItem: any) => prevItem.id === newItem.id)
                );
                return {
                    getVerifiedUsers: [...prev.getVerifiedUsers, ...newItems],
                };
            },
        }).then(() => setLoadingVerifiedMore(false)).catch(() => setLoadingVerifiedMore(false));
    };

    const [verifyUserMutation, { loading: verifyingUser }] = useMutation<any, any>(VERIFY_USER, {
        onCompleted: (res: any) => {
            Toast.show({ type: 'success', text1: 'Usuario verificado', text2: `@${res.verifyUser.username} ahora cuenta con verificación.` });
            refetchVerified();
            if (verifiedSearchTerm.length > 0) {
                searchAllUsers({ variables: { searchTerm: verifiedSearchTerm, limit: 20 } });
            }
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'No se pudo otorgar la verificación.');
        }
    });

    const [unverifyUserMutation, { loading: unverifyingUser }] = useMutation<any, any>(UNVERIFY_USER, {
        onCompleted: (res: any) => {
            Toast.show({ type: 'success', text1: 'Verificación quitada', text2: `Se quitó la verificación de @${res.unverifyUser.username}.` });
            refetchVerified();
            if (verifiedSearchTerm.length > 0) {
                searchAllUsers({ variables: { searchTerm: verifiedSearchTerm, limit: 20 } });
            }
        },
        onError: (err) => {
            Alert.alert('Error', err.message || 'No se pudo quitar la verificación.');
        }
    });

    const handleVerify = (userId: string) => {
        if (verificationTypes.length === 0) {
            Alert.alert('Error', 'No hay tipos de verificación configurados.');
            return;
        }
        const defaultType = verificationTypes[0];
        verifyUserMutation({
            variables: {
                userId,
                verificationTypeId: defaultType.id
            }
        });
    };

    const handleUnverify = (userId: string) => {
        Alert.alert(
            'Quitar Verificación',
            '¿Estás seguro de que deseas quitarle el verificado a este usuario?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Quitar',
                    style: 'destructive',
                    onPress: () => {
                        unverifyUserMutation({
                            variables: { userId }
                        });
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Administración</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>Gestión global del sistema</Text>
                </View>
                <View style={[styles.adminBadge, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
                    <Ionicons name="settings" size={20} color="#6366F1" />
                </View>
            </View>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'config' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('config')}
                >
                    <Ionicons 
                        name={activeTab === 'config' ? "options" : "options-outline"} 
                        size={18} 
                        color={activeTab === 'config' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'config' ? colors.primary : colors.textSecondary }]}>
                        Config.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'users' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('users')}
                >
                    <Ionicons 
                        name={activeTab === 'users' ? "people" : "people-outline"} 
                        size={18} 
                        color={activeTab === 'users' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'users' ? colors.primary : colors.textSecondary }]}>
                        Permisos
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'verified' && { borderBottomColor: '#0095F6' }]}
                    onPress={() => setActiveTab('verified')}
                >
                    <Ionicons 
                        name={activeTab === 'verified' ? "checkmark-circle" : "checkmark-circle-outline"} 
                        size={18} 
                        color={activeTab === 'verified' ? '#0095F6' : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'verified' ? '#0095F6' : colors.textSecondary }]}>
                        Verificados
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'tiers' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('tiers')}
                >
                    <Ionicons 
                        name={activeTab === 'tiers' ? "shield" : "shield-outline"} 
                        size={18} 
                        color={activeTab === 'tiers' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'tiers' ? colors.primary : colors.textSecondary }]}>
                        Rangos
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'notifications' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('notifications')}
                >
                    <Ionicons 
                        name={activeTab === 'notifications' ? "megaphone" : "megaphone-outline"} 
                        size={18} 
                        color={activeTab === 'notifications' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'notifications' ? colors.primary : colors.textSecondary }]}>
                        Notif.
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab !== 'verified' ? (
                <ScrollView 
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        {activeTab === 'config' && <AdminAdsConfig />}
                        {activeTab === 'users' && <AdminUserPermissions />}
                        {activeTab === 'notifications' && <AdminGlobalNotifications />}
                        {activeTab === 'tiers' && <AdminUserTiers />}
                    </KeyboardAvoidingView>
                </ScrollView>
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Buscador */}
                    <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                            <Ionicons name="search" size={18} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Buscar usuario para verificar..."
                                placeholderTextColor={colors.textSecondary}
                                value={verifiedSearchTerm}
                                onChangeText={(text) => {
                                    setVerifiedSearchTerm(text);
                                    setHasVerifiedMore(true);
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {verifiedSearchTerm.length > 0 && (
                                <TouchableOpacity onPress={() => setVerifiedSearchTerm('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Listas */}
                    {verifiedLoading || searchAllLoading ? (
                        <ActivityIndicator size="large" color="#0095F6" style={{ marginTop: 60 }} />
                    ) : verifiedSearchTerm.length > 0 ? (
                        // Mostrar resultados de búsqueda global
                        <FlatList
                            data={searchAllResults}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="search-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.2, marginBottom: 12 }} />
                                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin resultados</Text>
                                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                        No se encontraron usuarios que coincidan con "{verifiedSearchTerm}".
                                    </Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const isVerified = !!item.verificationType;
                                return (
                                    <View style={[styles.verifiedCard, { backgroundColor: colors.surface, borderColor: isVerified ? 'rgba(0,149,246,0.3)' : colors.border }]}>
                                        <View style={[styles.verifiedCardTop, { justifyContent: 'space-between' }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                                <View style={[styles.verifiedAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                    {item.photoUrl ? (
                                                        <Image source={{ uri: item.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                                    ) : (
                                                        <Text style={[styles.verifiedAvatarText, { color: colors.textSecondary }]}>
                                                            {item.firstName?.[0] || ''}{item.lastName?.[0] || ''}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <Text style={[styles.verifiedName, { color: colors.text }]} numberOfLines={1}>
                                                            {item.firstName} {item.lastName}
                                                        </Text>
                                                        {isVerified && <VerifiedBadge size={14} style={{ marginLeft: 4 }} />}
                                                    </View>
                                                    <Text style={[styles.verifiedUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                                                        @{item.username}
                                                    </Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                style={[
                                                    isVerified ? styles.unverifyBtnSmall : styles.verifyBtnSmall,
                                                    { borderColor: isVerified ? colors.error : '#0095F6', backgroundColor: isVerified ? 'transparent' : '#0095F6' },
                                                    (verifyingUser || unverifyingUser) && { opacity: 0.5 }
                                                ]}
                                                disabled={verifyingUser || unverifyingUser}
                                                onPress={() => isVerified ? handleUnverify(item.id) : handleVerify(item.id)}
                                            >
                                                <Text style={isVerified ? [styles.unverifyBtnSmallText, { color: colors.error }] : styles.verifyBtnSmallText}>
                                                    {isVerified ? 'Quitar' : 'Verificar'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    ) : (
                        // Mostrar usuarios verificados actuales
                        <FlatList
                            data={verifiedUsers}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={verifiedLoading}
                                    onRefresh={() => { setHasVerifiedMore(true); refetchVerified(); }}
                                    colors={['#0095F6']}
                                    tintColor="#0095F6"
                                />
                            }
                            onEndReached={handleLoadMoreVerified}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={
                                loadingVerifiedMore ? (
                                    <View style={{ paddingVertical: 20 }}>
                                        <ActivityIndicator size="small" color="#0095F6" />
                                    </View>
                                ) : null
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="checkmark-circle-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.2, marginBottom: 12 }} />
                                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin verificados</Text>
                                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                        No hay usuarios verificados actualmente. Usa el buscador de arriba para encontrar y verificar cuentas.
                                    </Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={[styles.verifiedCard, { backgroundColor: colors.surface, borderColor: 'rgba(0,149,246,0.3)' }]}>
                                    <View style={[styles.verifiedCardTop, { justifyContent: 'space-between' }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <View style={[styles.verifiedAvatar, { backgroundColor: 'rgba(0,149,246,0.06)' }]}>
                                                {item.photoUrl ? (
                                                    <Image source={{ uri: item.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                                ) : (
                                                    <Text style={styles.verifiedAvatarText}>
                                                        {item.firstName?.[0] || ''}{item.lastName?.[0] || ''}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <Text style={[styles.verifiedName, { color: colors.text }]} numberOfLines={1}>
                                                        {item.firstName} {item.lastName}
                                                    </Text>
                                                    <VerifiedBadge size={14} style={{ marginLeft: 4 }} />
                                                </View>
                                                <Text style={[styles.verifiedUsername, { color: colors.textSecondary }]} numberOfLines={1}>
                                                    @{item.username}
                                                </Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.unverifyBtnSmall, { borderColor: colors.error, backgroundColor: 'transparent' }, unverifyingUser && { opacity: 0.5 }]}
                                            disabled={unverifyingUser}
                                            onPress={() => handleUnverify(item.id)}
                                        >
                                            <Text style={[styles.unverifyBtnSmallText, { color: colors.error }]}>
                                                Quitar
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        marginRight: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 12,
    },
    adminBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    searchContainer: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        height: '100%',
    },
    verifiedCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
    },
    verifiedCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    verifiedAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    verifiedAvatarText: {
        color: '#0095F6',
        fontSize: 16,
        fontWeight: '700',
    },
    verifiedName: {
        fontSize: 15,
        fontWeight: '700',
    },
    verifiedUsername: {
        fontSize: 12,
        marginTop: 2,
    },
    verifyBtnSmall: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifyBtnSmallText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    unverifyBtnSmall: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unverifyBtnSmallText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
});
