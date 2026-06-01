import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator, Alert, TextInput, ScrollView, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';
import {
    GET_USER_TIERS,
    CREATE_USER_TIER,
    UPDATE_USER_TIER,
    DELETE_USER_TIER,
    ASSIGN_USER_TIER,
    SEARCH_USERS_FOR_VERIFICATION
} from '../graphql/moderation.operations';

export default function AdminUserTiers() {
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const { data: tiersData, loading: loadingTiers, refetch: refetchTiers } = useQuery<any>(GET_USER_TIERS);
    const tiers = tiersData?.getUserTiers || [];

    // Modal state for Create/Edit Tier
    const [tierModalVisible, setTierModalVisible] = useState(false);
    const [editingTier, setEditingTier] = useState<any>(null); // null means create

    // Form inputs
    const [tierId, setTierId] = useState('');
    const [tierName, setTierName] = useState('');
    const [maxCarouselItems, setMaxCarouselItems] = useState('10');
    const [maxVideos, setMaxVideos] = useState('3');
    const [maxVideoDuration, setMaxVideoDuration] = useState('60');
    const [maxVideoQuality, setMaxVideoQuality] = useState('720p');
    const [maxVideoBitrateKbps, setMaxVideoBitrateKbps] = useState('3000');
    const [maxUploadSizeMb, setMaxUploadSizeMb] = useState('50.0');

    // Assign User Tier Modal State
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchAllUsers, { data: searchData, loading: loadingSearch }] = useLazyQuery<any>(SEARCH_USERS_FOR_VERIFICATION, {
        fetchPolicy: 'network-only'
    });
    const searchResults = searchData?.searchUsers || [];

    // Debounce for user search
    useEffect(() => {
        if (assignModalVisible && searchTerm.length > 0) {
            const delay = setTimeout(() => {
                searchAllUsers({ variables: { searchTerm, limit: 15 } });
            }, 300);
            return () => clearTimeout(delay);
        }
    }, [searchTerm, assignModalVisible]);

    // Mutations
    const [createTier, { loading: creating }] = useMutation<any, any>(CREATE_USER_TIER, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Rango creado exitosamente' });
            setTierModalVisible(false);
            refetchTiers();
        },
        onError: (err: any) => Alert.alert('Error', err.message || 'No se pudo crear el rango.')
    });

    const [updateTier, { loading: updating }] = useMutation<any, any>(UPDATE_USER_TIER, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Rango actualizado exitosamente' });
            setTierModalVisible(false);
            refetchTiers();
        },
        onError: (err: any) => Alert.alert('Error', err.message || 'No se pudo actualizar el rango.')
    });

    const [deleteTier] = useMutation<any, any>(DELETE_USER_TIER, {
        onCompleted: () => {
            Toast.show({ type: 'success', text1: 'Rango eliminado' });
            refetchTiers();
        },
        onError: (err: any) => Alert.alert('Error', err.message || 'No se pudo eliminar el rango.')
    });

    const [assignTier, { loading: assigning }] = useMutation<any, any>(ASSIGN_USER_TIER, {
        onCompleted: (res: any) => {
            Toast.show({ type: 'success', text1: 'Rango asignado', text2: `@${res.assignUserTier.username} ahora es ${res.assignUserTier.tier?.name || 'Estándar'}` });
            if (searchTerm.length > 0) {
                searchAllUsers({ variables: { searchTerm, limit: 15 } });
            }
        },
        onError: (err: any) => Alert.alert('Error', err.message || 'No se pudo asignar el rango.')
    });

    const handleOpenModal = (tier: any = null) => {
        if (tier) {
            setEditingTier(tier);
            setTierId(tier.id);
            setTierName(tier.name);
            setMaxCarouselItems(String(tier.maxCarouselItems));
            setMaxVideos(String(tier.maxVideos));
            setMaxVideoDuration(String(tier.maxVideoDuration));
            setMaxVideoQuality(tier.maxVideoQuality);
            setMaxVideoBitrateKbps(String(tier.maxVideoBitrateKbps ?? '3000'));
            setMaxUploadSizeMb(String(tier.maxUploadSizeMb));
        } else {
            setEditingTier(null);
            setTierId('');
            setTierName('');
            setMaxCarouselItems('10');
            setMaxVideos('3');
            setMaxVideoDuration('60');
            setMaxVideoQuality('720p');
            setMaxVideoBitrateKbps('3000');
            setMaxUploadSizeMb('50.0');
        }
        setTierModalVisible(true);
    };

    const handleSaveTier = () => {
        if (!tierId.trim() || !tierName.trim()) {
            Alert.alert('Faltan campos', 'Por favor ingresa un identificador y nombre para el rango.');
            return;
        }

        const variables = {
            id: tierId.trim().toUpperCase(),
            name: tierName.trim(),
            maxCarouselItems: parseInt(maxCarouselItems) || 10,
            maxVideos: parseInt(maxVideos) || 3,
            maxVideoDuration: parseInt(maxVideoDuration) || 60,
            maxVideoQuality,
            maxVideoBitrateKbps: parseInt(maxVideoBitrateKbps) || 3000,
            maxUploadSizeMb: parseFloat(maxUploadSizeMb) || 50.0
        };

        if (editingTier) {
            updateTier({ variables: { input: { ...variables, id: editingTier.id } } });
        } else {
            createTier({ variables: { input: variables } });
        }
    };

    const handleDeleteTier = (id: string, name: string) => {
        if (id === 'STANDARD') {
            Alert.alert('Acceso denegado', 'No se puede eliminar el rango Estándar por defecto.');
            return;
        }

        Alert.alert(
            'Eliminar Rango',
            `¿Estás seguro de que deseas eliminar el rango "${name}"? Todos los usuarios de este rango regresarán automáticamente al rango Estándar.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => deleteTier({ variables: { id } }) }
            ]
        );
    };

    const handleAssignPress = (userId: string, currentTierId: string) => {
        const options = tiers.map((t: any) => ({
            text: t.name,
            onPress: () => assignTier({ variables: { userId, tierId: t.id } })
        }));

        Alert.alert(
            'Asignar Rango',
            'Selecciona el nuevo nivel de límites para este usuario:',
            [
                ...options,
                { text: 'Cancelar', style: 'cancel' }
            ]
        );
    };

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
    };

    const formatQuality = (quality: string) => {
        if (quality === '720p') return 'Estándar 720p';
        if (quality === '1080p') return 'Full HD 1080p';
        if (quality === '1080p_high') return '1080p Alta Calidad';
        return quality;
    };

    if (loadingTiers) {
        return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={() => handleOpenModal(null)}>
                    <Ionicons name="add" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Crear Rango</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButtonSecondary, { borderColor: colors.primary }]} onPress={() => { setSearchTerm(''); setAssignModalVisible(true); }}>
                    <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionButtonTextSecondary, { color: colors.primary }]}>Asignar a Usuario</Text>
                </TouchableOpacity>
            </View>

            {tiers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay rangos creados</Text>
                </View>
            ) : (
                tiers.map((item: any) => (
                    <View key={item.id} style={[styles.tierCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.tierHeader}>
                            <View style={styles.tierTitleBlock}>
                                <Text style={[styles.tierName, { color: colors.text }]}>{item.name}</Text>
                                <Text style={[styles.tierId, { color: colors.textSecondary }]}>ID: {item.id}</Text>
                            </View>
                            <View style={styles.tierActions}>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenModal(item)}>
                                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                                </TouchableOpacity>
                                {item.id !== 'STANDARD' && (
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteTier(item.id, item.name)}>
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.limitsGrid}>
                            <View style={styles.limitItem}>
                                <Ionicons name="images-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Carrusel Máx:</Text>
                                <Text style={[styles.limitValue, { color: colors.text }]}>{item.maxCarouselItems} arch.</Text>
                            </View>
                            <View style={styles.limitItem}>
                                <Ionicons name="videocam-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Videos Máx:</Text>
                                <Text style={[styles.limitValue, { color: colors.text }]}>{item.maxVideos}</Text>
                            </View>
                            <View style={styles.limitItem}>
                                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Duración Video:</Text>
                                <Text style={[styles.limitValue, { color: colors.text }]}>{formatDuration(item.maxVideoDuration)}</Text>
                            </View>
                            <View style={styles.limitItem}>
                                <Ionicons name="options-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Calidad Video:</Text>
                                <Text style={[styles.limitValue, { color: colors.text }]}>{formatQuality(item.maxVideoQuality)}</Text>
                            </View>
                            <View style={styles.limitItem}>
                                <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Bitrate Video:</Text>
                                <Text style={[styles.limitValue, { color: colors.text }]}>{item.maxVideoBitrateKbps} Kbps</Text>
                            </View>
                            <View style={styles.limitItem}>
                                <Ionicons name="cloud-upload-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Peso Subida:</Text>
                                <Text style={[styles.limitValue, { color: colors.text }]}>{item.maxUploadSizeMb} MB</Text>
                            </View>
                        </View>
                    </View>
                ))
            )}

            {/* Modal para Crear / Editar Rango */}
            <Modal visible={tierModalVisible} animationType="slide" transparent>
                <View style={styles.modalBackground}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingTier ? 'Editar Rango' : 'Crear Rango'}</Text>
                            <TouchableOpacity onPress={() => setTierModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, padding: 16 }}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Identificador Único (ID)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                placeholder="Ej: VIP, PREMIUM"
                                placeholderTextColor={colors.textSecondary}
                                value={tierId}
                                onChangeText={setTierId}
                                editable={!editingTier}
                                autoCapitalize="characters"
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre del Rango</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                placeholder="Ej: Premium, Oro"
                                placeholderTextColor={colors.textSecondary}
                                value={tierName}
                                onChangeText={setTierName}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Imágenes/Videos por Publicación (Carrusel)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                keyboardType="number-pad"
                                value={maxCarouselItems}
                                onChangeText={setMaxCarouselItems}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cantidad Máxima de Videos</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                keyboardType="number-pad"
                                value={maxVideos}
                                onChangeText={setMaxVideos}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Duración Máxima de Video (segundos)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                keyboardType="number-pad"
                                value={maxVideoDuration}
                                onChangeText={setMaxVideoDuration}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bitrate Máximo de Video (Kbps)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                keyboardType="number-pad"
                                placeholder="Ej: 3000 (3 Mbps)"
                                placeholderTextColor={colors.textSecondary}
                                value={maxVideoBitrateKbps}
                                onChangeText={setMaxVideoBitrateKbps}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Peso Máximo de Archivo (MB)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                keyboardType="numeric"
                                value={maxUploadSizeMb}
                                onChangeText={setMaxUploadSizeMb}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Calidad de Video</Text>
                            <View style={styles.qualitySelectorRow}>
                                {['720p', '1080p', '1080p_high'].map((q) => (
                                    <TouchableOpacity
                                        key={q}
                                        style={[
                                            styles.qualityOption,
                                            { borderColor: colors.border, backgroundColor: colors.surface },
                                            maxVideoQuality === q && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                                        ]}
                                        onPress={() => setMaxVideoQuality(q)}
                                    >
                                        <Text style={[styles.qualityOptionText, { color: maxVideoQuality === q ? colors.primary : colors.text }]}>
                                            {formatQuality(q)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 24, marginBottom: 40 }]}
                                onPress={handleSaveTier}
                                disabled={creating || assigning}
                            >
                                {(creating || assigning) ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal para Asignar Rango a Usuario */}
            <Modal visible={assignModalVisible} animationType="slide" transparent>
                <View style={styles.modalBackground}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Asignar Rango a Usuario</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalSearchContainer}>
                            <View style={[styles.modalSearchBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                <Ionicons name="search" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.modalSearchInput, { color: colors.text }]}
                                    placeholder="Buscar usuario por nombre o @username..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {loadingSearch ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{ padding: 16 }}
                                renderItem={({ item }) => (
                                    <View style={[styles.userCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.userName, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
                                            <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
                                            <Text style={[styles.userCurrentTier, { color: colors.primary }]}>
                                                Nivel actual: {item.tier?.name || 'Estándar'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.assignBtn, { backgroundColor: colors.primary }]}
                                            onPress={() => handleAssignPress(item.id, item.tier?.id || 'STANDARD')}
                                        >
                                            <Text style={styles.assignBtnText}>Cambiar</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                ListEmptyComponent={
                                    searchTerm.length > 0 ? (
                                        <Text style={[styles.noResults, { color: colors.textSecondary }]}>No se encontraron usuarios</Text>
                                    ) : (
                                        <Text style={[styles.noResults, { color: colors.textSecondary }]}>Escribe el nombre de un usuario para buscarlo</Text>
                                    )
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        padding: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    actionButtonSecondary: {
        flex: 1,
        flexDirection: 'row',
        height: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionButtonTextSecondary: {
        fontSize: 14,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
    },
    tierCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    tierHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tierTitleBlock: {
        flexDirection: 'column',
    },
    tierName: {
        fontSize: 18,
        fontWeight: '800',
    },
    tierId: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    tierActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 6,
    },
    divider: {
        height: 0.6,
        marginVertical: 12,
        opacity: 0.6,
    },
    limitsGrid: {
        flexDirection: 'column',
        gap: 10,
    },
    limitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    limitLabel: {
        fontSize: 13,
        fontWeight: '600',
        width: 110,
    },
    limitValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        marginTop: 14,
    },
    input: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    qualitySelectorRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    qualityOption: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qualityOptionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    saveBtn: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    modalSearchContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    modalSearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        height: '100%',
    },
    userCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
    },
    userUsername: {
        fontSize: 12,
        marginTop: 2,
    },
    userCurrentTier: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
    },
    assignBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    assignBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    noResults: {
        textAlign: 'center',
        fontSize: 14,
        marginTop: 20,
    }
});
