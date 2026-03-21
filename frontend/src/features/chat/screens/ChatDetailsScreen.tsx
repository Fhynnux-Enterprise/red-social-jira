import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Platform,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { AppStackParamList } from '../../../navigation/AppNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { GET_CONVERSATION, DELETE_CONVERSATION_FOR_ME } from '../graphql/chat.operations';
import Toast from 'react-native-toast-message';

export default function ChatDetailsScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { id_conversation } = route.params || {};
    const { user: currentUser } = useAuth() as any;

    const { data, loading } = useQuery(GET_CONVERSATION, {
        variables: { id_conversation },
        skip: !id_conversation,
    });

    const otherUser = useMemo(() => {
        const participants = data?.getConversation?.participants;
        return participants?.find((p: any) => p.user.id !== currentUser?.id)?.user || null;
    }, [data, currentUser?.id]);

    const client = useApolloClient();
    const [deleteConversationForMeMutation] = useMutation(DELETE_CONVERSATION_FOR_ME);

    const handleDeleteChat = () => {
        Alert.alert(
            "Eliminar conversación",
            "¿Estás seguro de que deseas eliminar esta conversación? Esta acción se aplicará solo para ti.",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await deleteConversationForMeMutation({ variables: { id_conversation } });
                            client.cache.evict({ id: `Conversation:${id_conversation}` });
                            // Volvemos hasta la lista de mensajes (podría ser popToTop o navigate según el stack)
                            navigation.navigate('MainTabs', { screen: 'Messages' });
                        } catch (err) {
                            console.error("Error al eliminar conversación:", err);
                            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar la conversación.' });
                        }
                    } 
                }
            ]
        );
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
                        style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                        onPress={() => navigation.navigate('MainTabs', { 
                            screen: 'Profile', 
                            params: { userId: otherUser.id } 
                        })}
                    >
                        <Ionicons name="person" size={24} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Perfil</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                        <Ionicons name="notifications" size={24} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Silenciar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                        <Ionicons name="search" size={24} color={colors.primary} />
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Buscar</Text>
                    </TouchableOpacity>
                </View>

                {/* Multimedia */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Multimedia</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                    <View style={styles.emptyMediaContainer}>
                        <Ionicons name="image-outline" size={32} color={colors.textSecondary} style={{ marginBottom: 8, opacity: 0.5 }} />
                        <Text style={[styles.emptyMediaText, { color: colors.textSecondary }]}>
                            Aún no existen archivos multimedia compartidos.
                        </Text>
                    </View>
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
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
});
