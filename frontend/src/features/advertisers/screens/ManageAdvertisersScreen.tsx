import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import AdvertisersPermissionsTab from '../components/AdvertisersPermissionsTab';
import LocalAdsTab from '../components/LocalAdsTab';

type ManageTab = 'advertisers' | 'ads';

export default function ManageAdvertisersScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Gestión de Publicidad</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Anunciantes y publicaciones locales</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(76,175,80,0.12)' }]}>
                    <Ionicons name="people" size={20} color="#4CAF50" />
                </View>
            </View>



            {/* Content */}
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>
                <AdvertisersPermissionsTab />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerSub: { fontSize: 12 },
    badge: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 7,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabLabel: { fontSize: 14, fontWeight: '700' },
});
