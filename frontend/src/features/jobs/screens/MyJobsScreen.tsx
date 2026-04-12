import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_MY_JOB_OFFERS } from '../graphql/jobs.operations';
import JobOfferCard from '../components/JobOfferCard';

export default function MyJobsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data, loading, refetch } = useQuery(GET_MY_JOB_OFFERS, {
        fetchPolicy: 'cache-and-network',
    });

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.06)' }]}>
                <Ionicons name="folder-open-outline" size={40} color="#FF6524" style={{ opacity: 0.7 }} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes publicaciones</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                No has publicado ninguna oferta de empleo aún.
            </Text>
            <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: '#FF6524' }]}
                onPress={() => router.push('/jobs/create')}
            >
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.emptyActionText}>Crear una publicación</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Publicaciones</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !data ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF6524" />
                </View>
            ) : (
                <FlatList
                    data={data?.myJobOffers ?? []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <JobOfferCard
                            item={item}
                            onPress={() => router.push(`/jobs/${item.id}/applicants`)}
                        />
                    )}
                    contentContainerStyle={[
                        styles.listContent,
                        (!data?.myJobOffers?.length) ? { flex: 1 } : null
                    ]}
                    ListEmptyComponent={renderEmpty}
                    refreshing={loading}
                    onRefresh={refetch}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 12,
        paddingTop: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
        padding: 8,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    cardContainer: {
        position: 'relative',
        marginBottom: 8, // Ensure enough space given JobOfferCard has margins
    },
    applicantsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: -4,
        marginBottom: 8,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#4CAF50',
        elevation: 3,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
    },
    applicantsBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    emptyActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
});
