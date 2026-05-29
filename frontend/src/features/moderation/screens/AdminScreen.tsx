import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import AdminAdsConfig from '../components/AdminAdsConfig';
import AdminUserPermissions from '../components/AdminUserPermissions';
import AdminGlobalNotifications from '../components/AdminGlobalNotifications';

type AdminTab = 'config' | 'users' | 'notifications';

export default function AdminScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<AdminTab>('config');

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
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Administración</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Gestión global del sistema</Text>
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
                        size={20} 
                        color={activeTab === 'config' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'config' ? colors.primary : colors.textSecondary }]}>
                        Configuración
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'users' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('users')}
                >
                    <Ionicons 
                        name={activeTab === 'users' ? "people" : "people-outline"} 
                        size={20} 
                        color={activeTab === 'users' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'users' ? colors.primary : colors.textSecondary }]}>
                        Permisos
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'notifications' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('notifications')}
                >
                    <Ionicons 
                        name={activeTab === 'notifications' ? "megaphone" : "megaphone-outline"} 
                        size={20} 
                        color={activeTab === 'notifications' ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.tabLabel, { color: activeTab === 'notifications' ? colors.primary : colors.textSecondary }]}>
                        Notificaciones
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                showsVerticalScrollIndicator={false}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    {activeTab === 'config' && <AdminAdsConfig />}
                    {activeTab === 'users' && <AdminUserPermissions />}
                    {activeTab === 'notifications' && <AdminGlobalNotifications />}
                </KeyboardAvoidingView>
            </ScrollView>
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
        marginLeft: 'auto',
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
        gap: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '700',
    }
});
