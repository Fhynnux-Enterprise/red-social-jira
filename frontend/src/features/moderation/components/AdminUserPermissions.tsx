import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';

export default function AdminUserPermissions() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <View style={{ padding: 20 }}>
            <Text style={styles.mainSectionTitle}>Accesos Especiales</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                        <Ionicons name="people-outline" size={24} color="#4CAF50" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Anunciantes Locales</Text>
                        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Gestionar permisos para creación de publicidad</Text>
                    </View>
                </View>
                
                <Text style={[styles.description, { color: colors.textSecondary, marginBottom: 16 }]}>
                    Aquí podrás habilitar a los usuarios que hayan realizado el pago para que tengan acceso a las herramientas de creación de anuncios locales.
                </Text>
                
                <TouchableOpacity 
                    style={[styles.placeholderBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '08' }]}
                    onPress={() => router.push('/admin/manage-advertisers')}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="people-outline" size={18} color={colors.primary} />
                        <Text style={[styles.placeholderBtnText, { color: colors.primary }]}>Gestionar Anunciantes</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainSectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14, marginLeft: 4, textTransform: 'uppercase', opacity: 0.6, color: '#888' },
    sectionCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    sectionSub: { fontSize: 12 },
    description: { fontSize: 13, lineHeight: 18 },
    placeholderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
    placeholderBtnText: { fontSize: 14, fontWeight: '600' }
});
