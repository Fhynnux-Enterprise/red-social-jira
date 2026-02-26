import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/context/AuthContext';
import { ProfileService } from '../services/profile.service';
import { colors } from '../../../theme/colors';

type UserData = {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    photoUrl: string | null;
};

export default function ProfileScreen() {
    const { signOut } = useAuth();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await ProfileService.getProfile();
                setUserData(data);
            } catch (error) {
                console.error('Error fetching profile', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!userData) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>No se pudo cargar el perfil.</Text>
                    <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    {userData.photoUrl ? (
                        <Image source={{ uri: userData.photoUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={50} color={colors.primary} />
                        </View>
                    )}
                    <Text style={styles.name}>{userData.firstName} {userData.lastName}</Text>
                    <Text style={styles.username}>@{userData.username}</Text>
                    <Text style={styles.email}>{userData.email}</Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={24} color={colors.dark.error} />
                        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.dark.background,
    },
    container: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 24,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 16,
        borderWidth: 3,
        borderColor: colors.primary,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.dark.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 3,
        borderColor: colors.primary,
        borderStyle: 'dashed',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.dark.text,
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 8,
    },
    email: {
        fontSize: 14,
        color: colors.dark.textSecondary,
    },
    footer: {
        marginBottom: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.dark.error,
        backgroundColor: 'rgba(207, 102, 121, 0.1)', // Error color with 10% opacity
    },
    logoutButtonText: {
        color: colors.dark.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: colors.dark.text,
        fontSize: 16,
        marginBottom: 20,
    },
});
