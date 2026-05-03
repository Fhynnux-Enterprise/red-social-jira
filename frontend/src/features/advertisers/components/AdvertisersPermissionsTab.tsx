import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, Image, Modal, TextInput, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../theme/ThemeContext';
import {
    GET_ADVERTISER_PERMISSIONS,
    GRANT_ADVERTISER_PERMISSION,
    UPDATE_ADVERTISER_PERMISSION,
    REVOKE_ADVERTISER_PERMISSION,
    GET_ADVERTISER_ADS,
    TOGGLE_LOCAL_AD,
    DELETE_LOCAL_AD,
} from '../graphql/advertisers.operations';
import { SEARCH_USERS } from '../../chat/graphql/chat.operations';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AdvertiserUser {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    email: string;
}

interface AdvertiserPermission {
    id: string;
    userId: string;
    isActive: boolean;
    expiresAt: string;
    maxAds: number;
    grantedBy?: string;
    createdAt: string;
    user: AdvertiserUser;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function AdvertisersPermissionsTab() {
    const { colors, isDark } = useTheme();
    const [showGrantModal, setShowGrantModal] = useState(false);
    const [editingPermission, setEditingPermission] = useState<AdvertiserPermission | null>(null);
    const [confirmRevoke, setConfirmRevoke] = useState<AdvertiserPermission | null>(null);
    const [selectedUserForAds, setSelectedUserForAds] = useState<AdvertiserPermission | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const LIMIT = 15;

    const { data, loading, refetch, fetchMore } = useQuery(GET_ADVERTISER_PERMISSIONS, {
        variables: { 
            search: debouncedSearch || undefined,
            limit: LIMIT,
            offset: 0
        },
        fetchPolicy: 'network-only',
    });

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const handleLoadMore = () => {
        if (!loading && data?.getAdvertiserPermissions?.length >= LIMIT) {
            fetchMore({
                variables: {
                    offset: data.getAdvertiserPermissions.length,
                },
                updateQuery: (prev, { fetchMoreResult }) => {
                    if (!fetchMoreResult) return prev;
                    return {
                        getAdvertiserPermissions: [
                            ...prev.getAdvertiserPermissions,
                            ...fetchMoreResult.getAdvertiserPermissions,
                        ],
                    };
                },
            });
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    const [revokePermission, { loading: revoking }] = useMutation(REVOKE_ADVERTISER_PERMISSION, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Permiso revocado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const [updatePermission] = useMutation(UPDATE_ADVERTISER_PERMISSION, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Permiso actualizado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const permissions: AdvertiserPermission[] = data?.getAdvertiserPermissions ?? [];

    const handleRevoke = (permission: AdvertiserPermission) => {
        setConfirmRevoke(permission);
    };

    const onConfirmRevoke = () => {
        if (confirmRevoke) {
            revokePermission({ variables: { id: confirmRevoke.id } });
            setConfirmRevoke(null);
        }
    };

    const handleToggle = (permission: AdvertiserPermission) => {
        updatePermission({
            variables: {
                input: { id: permission.id, isActive: !permission.isActive },
            },
        });
    };

    const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

    const isInitialLoading = loading && !data && !isRefreshing;

    return (
        <View style={{ flex: 1, padding: 20 }}>
            {/* Header row */}
            <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ANUNCIANTES ACTIVOS</Text>
                    <Text style={[styles.countBadge, { color: colors.text }]}>
                        Gestión de permisos
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setShowGrantModal(true)}
                >
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.addBtnText}>Añadir</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchBarWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                    style={[styles.searchBarInput, { color: colors.text }]}
                    placeholder="Buscar por nombre o @username..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoCapitalize="none"
                />
                {searchTerm.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTerm('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {isInitialLoading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : permissions.length === 0 ? (
                <EmptyState colors={colors} />
            ) : (
                <FlatList
                    data={permissions}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    onRefresh={handleRefresh}
                    refreshing={isRefreshing}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={(loading && !isInitialLoading) ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                    ) : null}
                    renderItem={({ item }) => (
                        <PermissionCard
                            permission={item}
                            colors={colors}
                            isDark={isDark}
                            isExpired={isExpired(item.expiresAt)}
                            onRevoke={() => handleRevoke(item)}
                            onToggle={() => handleToggle(item)}
                            onEdit={() => setEditingPermission(item)}
                            onViewAds={() => setSelectedUserForAds(item)}
                        />
                    )}
                />
            )}

            <GrantModal
                visible={showGrantModal}
                onClose={() => setShowGrantModal(false)}
                onSuccess={() => { setShowGrantModal(false); refetch(); }}
                colors={colors}
                isDark={isDark}
            />

            <EditPermissionModal
                visible={!!editingPermission}
                permission={editingPermission}
                onClose={() => setEditingPermission(null)}
                onSuccess={() => { setEditingPermission(null); refetch(); }}
                colors={colors}
                isDark={isDark}
            />

            <AdvertiserAdsModal
                visible={!!selectedUserForAds}
                advertiser={selectedUserForAds?.user}
                onClose={() => setSelectedUserForAds(null)}
                colors={colors}
                isDark={isDark}
            />

            <CustomConfirmDialog
                visible={!!confirmRevoke}
                title="Revocar Acceso"
                message={`¿Estás seguro de que quieres quitarle el acceso a la publicidad a @${confirmRevoke?.user.username}?`}
                confirmText="Revocar"
                onCancel={() => setConfirmRevoke(null)}
                onConfirm={onConfirmRevoke}
                colors={colors}
                isDestructive
            />
        </View>
    );
}

// ─── Tarjeta de Permiso ───────────────────────────────────────────────────────

function PermissionCard({ permission, colors, isDark, isExpired, onRevoke, onToggle, onEdit, onViewAds }: any) {
    const statusColor = isExpired ? '#EF4444' : permission.isActive ? '#22C55E' : '#F59E0B';
    const statusLabel = isExpired ? 'Expirado' : permission.isActive ? 'Activo' : 'Pausado';

    const expiryDate = new Date(permission.expiresAt).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
    }) + ' a las ' + new Date(permission.expiresAt).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
                {/* Avatar */}
                {permission.user.photoUrl ? (
                    <Image source={{ uri: permission.user.photoUrl }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '22' }]}>
                        <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                            {permission.user.firstName?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                    </View>
                )}

                {/* Info */}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                        {permission.user.firstName} {permission.user.lastName}
                    </Text>
                    <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
                        @{permission.user.username}
                    </Text>
                </View>

                {/* Status pill */}
                <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
            </View>

            {/* Details row */}
            <View style={[styles.detailsRow, { borderTopColor: colors.border }]}>
                <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        Vence: {expiryDate}
                    </Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="megaphone-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        Máx. {permission.maxAds} anuncios
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={onEdit}
                >
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={onToggle}
                >
                    <Ionicons
                        name={permission.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={16}
                        color={colors.textSecondary}
                    />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                        {permission.isActive ? 'Pausar' : 'Activar'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' }]}
                    onPress={onViewAds}
                >
                    <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Anuncios</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#EF444430', backgroundColor: '#EF444408' }]}
                    onPress={onRevoke}
                >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Revocar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Modal de Otorgar Permiso ─────────────────────────────────────────────────

function GrantModal({ visible, onClose, onSuccess, colors, isDark }: any) {
    const [maxAds, setMaxAds] = useState('5');
    const [expiresAt, setExpiresAt] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 31);
        return d;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const [grantPermission, { loading }] = useMutation(GRANT_ADVERTISER_PERMISSION, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Permiso otorgado correctamente' });
            setSelectedUser(null);
            onSuccess();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const handleGrant = () => {
        if (!selectedUser) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Busca y selecciona un usuario' });
            return;
        }
        grantPermission({
            variables: {
                input: {
                    userId: selectedUser.id,
                    expiresAt: expiresAt.toISOString(),
                    maxAds: parseInt(maxAds, 10) || 5,
                },
            },
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Otorgar Acceso</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Anunciante</Text>
                    {selectedUser ? (
                        <View style={[styles.selectedUserCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.primary }]}>
                            {selectedUser.photoUrl ? (
                                <Image source={{ uri: selectedUser.photoUrl }} style={styles.miniAvatar} />
                            ) : (
                                <View style={[styles.miniAvatar, { backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{selectedUser.firstName?.[0]}</Text>
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.selectedUserName, { color: colors.text }]}>{selectedUser.firstName} {selectedUser.lastName}</Text>
                                <Text style={[styles.selectedUserHandle, { color: colors.textSecondary }]}>@{selectedUser.username}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedUser(null)}>
                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.modalInput, styles.selectUserBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                            onPress={() => setShowSearchModal(true)}
                        >
                            <Ionicons name="search-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Seleccionar Usuario...</Text>
                        </TouchableOpacity>
                    )}

                    <UserSearchModal 
                        visible={showSearchModal}
                        onClose={() => setShowSearchModal(false)}
                        onSelect={(user: any) => {
                            setSelectedUser(user);
                            setShowSearchModal(false);
                        }}
                        colors={colors}
                        isDark={isDark}
                    />

                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Máx. Anuncios Permitidos</Text>
                    <TextInput
                        style={[styles.modalInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, color: colors.text }]}
                        placeholder="5"
                        placeholderTextColor={colors.textSecondary}
                        value={maxAds}
                        onChangeText={setMaxAds}
                        keyboardType="number-pad"
                    />

                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Expiración (Fecha y Hora)</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.modalInput, styles.dateBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.text, fontSize: 13 }}>
                                    {expiresAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalInput, styles.dateBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.text, fontSize: 13 }}>
                                    {expiresAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={expiresAt}
                                mode="date"
                                minimumDate={new Date()}
                                onChange={(_, date) => {
                                    setShowDatePicker(false);
                                    if (date) {
                                        const newDate = new Date(expiresAt);
                                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                        setExpiresAt(newDate);
                                    }
                                }}
                            />
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                value={expiresAt}
                                mode="time"
                                onChange={(_, date) => {
                                    setShowTimePicker(false);
                                    if (date) {
                                        const newDate = new Date(expiresAt);
                                        newDate.setHours(date.getHours(), date.getMinutes());
                                        setExpiresAt(newDate);
                                    }
                                }}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.grantBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleGrant}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#FFF" />
                                : <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.grantBtnText}>Otorgar Permiso</Text>
                                </>
                            }
                        </TouchableOpacity>
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Estado Vacío ─────────────────────────────────────────────────────────────

function EmptyState({ colors }: any) {
    return (
        <View style={styles.emptyContainer}>
            <Ionicons name="person-add-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin anunciantes aún</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Toca "Añadir" para otorgar permiso de publicidad a un usuario que haya pagado.
            </Text>
        </View>
    );
}

// ─── Modal de Editar Permiso ──────────────────────────────────────────────────

function EditPermissionModal({ visible, permission, onClose, onSuccess, colors, isDark }: any) {
    const [maxAds, setMaxAds] = useState('5');
    const [expiresAt, setExpiresAt] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    React.useEffect(() => {
        if (permission) {
            setMaxAds(permission.maxAds.toString());
            setExpiresAt(new Date(permission.expiresAt));
        }
    }, [permission]);

    const [updatePermission, { loading }] = useMutation(UPDATE_ADVERTISER_PERMISSION, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Permiso actualizado' });
            onSuccess();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const handleUpdate = () => {
        updatePermission({
            variables: {
                input: {
                    id: permission?.id,
                    expiresAt: expiresAt.toISOString(),
                    maxAds: parseInt(maxAds, 10) || 5,
                },
            },
        });
    };

    if (!permission) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Campaña</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={[styles.selectedUserCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, marginBottom: 20 }]}>
                            <Image source={{ uri: permission?.user?.photoUrl || 'https://via.placeholder.com/40' }} style={styles.miniAvatar} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.selectedUserName, { color: colors.text }]}>{permission?.user?.firstName} {permission?.user?.lastName}</Text>
                                <Text style={[styles.selectedUserHandle, { color: colors.textSecondary }]}>@{permission?.user?.username}</Text>
                            </View>
                        </View>

                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Máx. Anuncios Permitidos</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, color: colors.text }]}
                            placeholder="5"
                            placeholderTextColor={colors.textSecondary}
                            value={maxAds}
                            onChangeText={setMaxAds}
                            keyboardType="number-pad"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nueva Expiración (Fecha y Hora)</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.modalInput, styles.dateBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.text, fontSize: 13 }}>
                                    {expiresAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalInput, styles.dateBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.text, fontSize: 13 }}>
                                    {expiresAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={expiresAt}
                                mode="date"
                                minimumDate={new Date()}
                                onChange={(_, date) => {
                                    setShowDatePicker(false);
                                    if (date) {
                                        const newDate = new Date(expiresAt);
                                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                        setExpiresAt(newDate);
                                    }
                                }}
                            />
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                value={expiresAt}
                                mode="time"
                                onChange={(_, date) => {
                                    setShowTimePicker(false);
                                    if (date) {
                                        const newDate = new Date(expiresAt);
                                        newDate.setHours(date.getHours(), date.getMinutes());
                                        setExpiresAt(newDate);
                                    }
                                }}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.grantBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleUpdate}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#FFF" />
                                : <>
                                    <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.grantBtnText}>Guardar Cambios</Text>
                                </>
                            }
                        </TouchableOpacity>
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Modal de Anuncios del Anunciante ────────────────────────────────────────

function AdvertiserAdsModal({ visible, advertiser, onClose, colors, isDark }: any) {
    const { data, loading, refetch } = useQuery(GET_ADVERTISER_ADS, {
        variables: { userId: advertiser?.id },
        skip: !advertiser?.id,
        fetchPolicy: 'network-only',
    });

    const [toggleAd] = useMutation(TOGGLE_LOCAL_AD, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Estado actualizado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const [deleteAd] = useMutation(DELETE_LOCAL_AD, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Anuncio eliminado' });
            refetch();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const ads = data?.getAdvertiserAds ?? [];

    const handleDelete = (ad: any) => {
        Alert.alert(
            'Eliminar Anuncio',
            `¿Seguro que quieres eliminar "${ad.title}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteAd({ variables: { id: ad.id } }),
                },
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={[styles.modalNav, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.modalNavTitle, { color: colors.text }]}>Anuncios de {advertiser?.firstName}</Text>
                        <Text style={[styles.modalNavSub, { color: colors.textSecondary }]}>@{advertiser?.username}</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : ads.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                        <Ionicons name="megaphone-outline" size={60} color={colors.textSecondary + '40'} />
                        <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>Este usuario no tiene anuncios publicados.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={ads}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }) => (
                            <AdminAdCard 
                                ad={item} 
                                colors={colors} 
                                onToggle={() => toggleAd({ variables: { id: item.id, isActive: !item.isActive } })}
                                onDelete={() => handleDelete(item)}
                            />
                        )}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

function AdminAdCard({ ad, colors, onToggle, onDelete }: any) {
    const coverImage = ad.media?.find((m: any) => m.type === 'IMAGE')?.url;
    const advertiser = ad.advertiser;

    return (
        <View style={[styles.feedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Cabecera estilo Feed */}
            <View style={styles.feedHeader}>
                {advertiser?.photoUrl ? (
                    <Image source={{ uri: advertiser.photoUrl }} style={styles.feedAvatar} />
                ) : (
                    <View style={[styles.feedAvatar, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>{advertiser?.firstName?.[0]}</Text>
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.feedName, { color: colors.text }]}>{advertiser?.firstName} {advertiser?.lastName}</Text>
                    <View style={styles.feedAdBadge}>
                        <Ionicons name="megaphone" size={10} color="white" />
                        <Text style={styles.feedAdBadgeText}>Publicidad</Text>
                    </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: ad.isActive ? '#22C55E20' : '#F59E0B20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: ad.isActive ? '#22C55E' : '#F59E0B' }]} />
                    <Text style={{ color: ad.isActive ? '#22C55E' : '#F59E0B', fontSize: 11, fontWeight: '700' }}>
                        {ad.isActive ? 'Activo' : 'Pausado'}
                    </Text>
                </View>
            </View>

            {/* Contenido */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <Text style={[styles.feedTitle, { color: colors.text }]}>{ad.title}</Text>
                <Text style={[styles.feedBody, { color: colors.textSecondary }]}>{ad.description}</Text>
            </View>

            {/* Media 3:4 */}
            {coverImage && (
                <View style={styles.feedMediaContainer}>
                    <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                </View>
            )}

            {/* Simulación de Botones CTA (Solo visual para el admin) */}
            <View style={{ padding: 12, flexDirection: 'row', gap: 8, opacity: 0.7 }}>
                {ad.whatsappPhone && (
                    <View style={[styles.feedCtaBtn, { backgroundColor: '#25D366', flex: 1 }]}>
                        <Ionicons name="logo-whatsapp" size={16} color="white" />
                        <Text style={styles.feedCtaText}>WhatsApp</Text>
                    </View>
                )}
                {ad.actionUrl && (
                    <View style={[styles.feedCtaBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                        <Text style={styles.feedCtaText}>{ad.actionLabel || 'Ver más'}</Text>
                        <Ionicons name="arrow-forward" size={14} color="white" />
                    </View>
                )}
            </View>

            {/* Acciones de Administrador */}
            <View style={[styles.feedAdminActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.adminBtn, { backgroundColor: ad.isActive ? '#F59E0B15' : '#22C55E15' }]}
                    onPress={onToggle}
                >
                    <Ionicons name={ad.isActive ? "pause" : "play"} size={16} color={ad.isActive ? '#F59E0B' : '#22C55E'} />
                    <Text style={{ color: ad.isActive ? '#F59E0B' : '#22C55E', fontWeight: '700' }}>
                        {ad.isActive ? 'Pausar Anuncio' : 'Activar Anuncio'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.adminBtn, { backgroundColor: '#EF444415' }]}
                    onPress={onDelete}
                >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontWeight: '700' }}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Modal de Búsqueda de Usuario ─────────────────────────────────────────────

function UserSearchModal({ visible, onClose, onSelect, colors, isDark }: any) {
    const [searchTerm, setSearchTerm] = useState('');
    const { data, loading } = useQuery(SEARCH_USERS, {
        variables: { searchTerm },
        skip: searchTerm.length < 2,
    });

    const users = data?.searchUsers ?? [];

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={[styles.searchModalContainer, { backgroundColor: colors.background }]}>
                {/* Search Header */}
                <View style={[styles.searchHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.searchBackBtn}>
                        <Ionicons name="close" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.searchInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: colors.text }]}
                        placeholder="Buscar por nombre o @username..."
                        placeholderTextColor={colors.textSecondary}
                        autoFocus
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoCapitalize="none"
                    />
                </View>

                {searchTerm.length < 2 ? (
                    <View style={styles.searchEmpty}>
                        <Ionicons name="search-outline" size={60} color={colors.textSecondary + '40'} />
                        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Escribe al menos 2 letras...</Text>
                    </View>
                ) : loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
                ) : (
                    <FlatList
                        data={users}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                                onPress={() => onSelect(item)}
                            >
                                {item.photoUrl ? (
                                    <Image source={{ uri: item.photoUrl }} style={styles.searchResultAvatar} />
                                ) : (
                                    <View style={[styles.searchResultAvatar, { backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.firstName?.[0]}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.firstName} {item.lastName}</Text>
                                    <Text style={{ color: colors.textSecondary }}>@{item.username}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textSecondary }}>
                                No se encontraron usuarios con "{searchTerm}"
                            </Text>
                        }
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

// ─── Diálogo de Confirmación Personalizado ────────────────────────────────────

function CustomConfirmDialog({ visible, title, message, confirmText, onCancel, onConfirm, colors, isDestructive }: any) {
    if (!visible) return null;
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.alertOverlay}>
                <View style={[styles.alertCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.alertIconWrapper, { backgroundColor: isDestructive ? '#EF444420' : colors.primary + '20' }]}>
                        <Ionicons name={isDestructive ? "alert-circle-outline" : "help-circle-outline"} size={32} color={isDestructive ? "#EF4444" : colors.primary} />
                    </View>
                    <Text style={[styles.alertTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{message}</Text>
                    
                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                        <TouchableOpacity 
                            style={[styles.alertBtn, { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.alertBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.alertBtn, { flex: 1, backgroundColor: isDestructive ? '#EF4444' : colors.primary }]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.alertBtnText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
    countBadge: { fontSize: 16, fontWeight: '700', marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    card: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    avatar: { width: 46, height: 46, borderRadius: 23 },
    avatarPlaceholder: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: '800' },
    userName: { fontSize: 15, fontWeight: '700' },
    userHandle: { fontSize: 13 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '700' },
    detailsRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    detailText: { fontSize: 12 },
    actions: { flexDirection: 'row', gap: 10, padding: 12, paddingTop: 0 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    actionText: { fontSize: 13, fontWeight: '600' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
    modalInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
    dateBtn: { flexDirection: 'row', alignItems: 'center' },
    grantBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, height: 54, borderRadius: 14 },
    grantBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    selectedUserCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        gap: 12,
    },
    miniAvatar: { width: 40, height: 40, borderRadius: 20 },
    selectedUserName: { fontSize: 15, fontWeight: '700' },
    selectedUserHandle: { fontSize: 13 },
    selectUserBtn: { flexDirection: 'row', alignItems: 'center' },
    // Search Modal
    searchModalContainer: { flex: 1 },
    searchHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    searchBackBtn: { padding: 4 },
    searchInput: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontSize: 16 },
    searchEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.6 },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
    searchResultAvatar: { width: 50, height: 50, borderRadius: 25 },
    // Empty
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    // Search Bar
    searchBarWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48, borderRadius: 12, borderWidth: 1, marginBottom: 20, gap: 10 },
    searchBarInput: { flex: 1, fontSize: 14 },
    // Modal Nav
    modalNav: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    modalNavTitle: { fontSize: 18, fontWeight: '700' },
    modalNavSub: { fontSize: 12 },
    backBtn: { padding: 4 },
    // Feed Card Styled
    feedCard: { borderRadius: 20, borderWidth: 1, marginBottom: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    feedHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    feedAvatar: { width: 40, height: 40, borderRadius: 20 },
    feedName: { fontSize: 15, fontWeight: '700' },
    feedAdBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6524', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start', marginTop: 2 },
    feedAdBadgeText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    feedTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    feedBody: { fontSize: 14, lineHeight: 20 },
    feedMediaContainer: { width: '100%', aspectRatio: 3/4 },
    feedCtaBtn: { height: 46, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    feedCtaText: { color: 'white', fontWeight: '800', fontSize: 14 },
    feedAdminActions: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
    adminBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    // Alert Dialog Styles
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30, zIndex: 1000 },
    alertCard: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.34, shadowRadius: 6.27 },
    alertIconWrapper: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    alertTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    alertMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    alertBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
