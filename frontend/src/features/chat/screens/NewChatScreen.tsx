import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@apollo/client';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../../navigation/AppNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_FOLLOWING } from '../../follows/graphql/follows.operations';
import { SEARCH_USERS, GET_OR_CREATE_CHAT } from '../graphql/chat.operations';

export default function NewChatScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const { user: currentUser } = useAuth() as any;

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // 1. Obtener seguidos por defecto
    const { data: followingData, loading: followingLoading } = useQuery(GET_FOLLOWING, {
        variables: { id_user: currentUser?.id },
        skip: !currentUser?.id,
    });

    // 2. Búsqueda global (Lazy Query manual con handleSearch)
    const { refetch: searchUsersQuery, loading: searchLoading } = useQuery(SEARCH_USERS, {
        variables: { searchTerm: '' },
        skip: true, // No ejecutar automáticamente
    });

    // Debounce simple para la búsqueda
    useEffect(() => {
        if (searchTerm.trim().length > 1) {
            const delayDebounceFn = setTimeout(async () => {
                const results = await searchUsersQuery({ searchTerm });
                setSearchResults(results.data?.searchUsers || []);
            }, 500);

            return () => clearTimeout(delayDebounceFn);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    // 3. Mutación para crear chat
    const [getOrCreateChat] = useMutation(GET_OR_CREATE_CHAT);

    const handleSelectUser = async (targetUser: any) => {
        try {
            const { data } = await getOrCreateChat({
                variables: { targetUserId: targetUser.id }
            });

            if (data?.getOrCreateOneOnOneChat?.id_conversation) {
                // Navegar al chat y resetear el stack para que al volver vaya a la lista
                navigation.replace('ChatRoom', { 
                    id_conversation: data.getOrCreateOneOnOneChat.id_conversation 
                });
            }
        } catch (error) {
            console.error('Error al iniciar chat:', error);
        }
    };

    const renderUserItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.userRow, { borderBottomColor: colors.border }]}
            onPress={() => handleSelectUser(item)}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                            {item.firstName?.[0]}{item.lastName?.[0]}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                        {item.firstName} {item.lastName}
                    </Text>
                    {item.badge && (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.badgeText}>{item.badge.title}</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
                    @{item.username}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    const displayedData = searchTerm.trim().length > 1 ? searchResults : (followingData?.getFollowing || []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header / Search Bar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Buscar personas..."
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoFocus
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.content}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {searchTerm.trim().length > 1 ? 'Resultados globales' : 'Personas que sigues'}
                </Text>

                {followingLoading || searchLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={displayedData}
                        renderItem={renderUserItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {searchTerm.trim().length > 1 
                                        ? 'No se encontraron usuarios.' 
                                        : 'Aún no sigues a nadie.'}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
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
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 10,
    },
    closeButton: {
        padding: 5,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 45,
        borderRadius: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    content: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    listContainer: {
        paddingHorizontal: 5,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
    },
    userHandle: {
        fontSize: 14,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    loaderContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: 40,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
