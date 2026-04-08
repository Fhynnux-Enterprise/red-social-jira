import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_JOB_APPLICATIONS } from '../graphql/jobs.operations';
import ReviewApplicationModal from '../components/ReviewApplicationModal';

export default function JobApplicantsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [selectedApplication, setSelectedApplication] = useState<any | null>(null);

    const { data, loading, refetch } = useQuery(GET_JOB_APPLICATIONS, {
        variables: { id_job_offer: id },
        fetchPolicy: 'cache-and-network',
        skip: !id,
    });

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.06)' }]}>
                <Ionicons name="people-outline" size={40} color="#FF6524" style={{ opacity: 0.7 }} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No hay postulantes</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Aún nadie se ha postulado a esta oferta de empleo.
            </Text>
        </View>
    );

    const getStatusColor = (status: string) => {
        if (status === 'ACCEPTED') return '#4CAF50';
        if (status === 'REJECTED') return '#F44336';
        return '#FF9800'; // PENDING
    };

    const getStatusLabel = (status: string) => {
        if (status === 'ACCEPTED') return 'Aceptado';
        if (status === 'REJECTED') return 'Rechazado';
        return 'Pendiente';
    };

    return (
        <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Candidatos</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !data ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF6524" />
                </View>
            ) : (
                <FlatList
                    data={data?.jobApplications ?? []}
                    keyExtractor={(item: any) => item.id_job_application || item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => setSelectedApplication(item)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.avatarWrap}>
                                {item.applicant.photoUrl ? (
                                    <Image source={{ uri: item.applicant.photoUrl }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={styles.avatarInitials}>
                                        {item.applicant.firstName[0]}{item.applicant.lastName[0]}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={[styles.applicantName, { color: colors.text }]} numberOfLines={1}>
                                    {item.applicant.firstName} {item.applicant.lastName}
                                </Text>
                                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={[
                        styles.listContent,
                        (!data?.jobApplications?.length) ? { flex: 1 } : null
                    ]}
                    ListEmptyComponent={renderEmpty}
                    refreshing={loading}
                    onRefresh={refetch}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {selectedApplication && (
                <ReviewApplicationModal
                    visible={!!selectedApplication}
                    onClose={() => setSelectedApplication(null)}
                    application={selectedApplication}
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
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
    avatarWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,101,36,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        color: '#FF6524',
        fontSize: 16,
        fontWeight: '700',
    },
    cardContent: {
        flex: 1,
    },
    applicantName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 12,
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
});
