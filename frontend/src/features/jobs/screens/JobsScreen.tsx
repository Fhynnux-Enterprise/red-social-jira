import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Platform, FlatList, ActivityIndicator, Animated, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_JOB_OFFERS, GET_PROFESSIONALS, GET_MY_JOB_OFFERS, GET_MY_APPLICATIONS, GET_MY_PROFESSIONAL_PROFILE } from '../graphql/jobs.operations';
import JobOfferCard from '../components/JobOfferCard';
import ProfessionalCard from '../components/ProfessionalCard';

type TabKey = 'offers' | 'services' | 'results';
type ResultsTabKey = 'my_applications' | 'my_offers' | 'my_services';

interface TabConfig {
    key: TabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
    { key: 'offers',   label: 'Ofertas',    icon: 'briefcase-outline',    iconActive: 'briefcase' },
    { key: 'services', label: 'Servicios',  icon: 'construct-outline',    iconActive: 'construct' },
    { key: 'results',  label: 'Resultados', icon: 'stats-chart-outline',  iconActive: 'stats-chart' },
];

export default function JobsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>('offers');
    const [resultsTab, setResultsTab] = useState<ResultsTabKey>('my_applications');
    const [tabWidths, setTabWidths] = useState<number[]>([]);
    const [tabOffsets, setTabOffsets] = useState<number[]>([]);
    const indicatorAnim = useRef(new Animated.Value(0)).current;
    const indicatorWidth = useRef(new Animated.Value(0)).current;

    const { data: offersData, loading: loadingOffers, refetch: refetchOffers } = useQuery<{jobOffers: any[]}>(GET_JOB_OFFERS, {
        variables: { limit: 20, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    const { data: profsData, loading: loadingProfs, refetch: refetchProfs } = useQuery<{professionalProfiles: any[]}>(GET_PROFESSIONALS, {
        variables: { limit: 20, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    const { data: myOffersData, loading: loadingMyOffers, refetch: refetchMyOffers } = useQuery<{myJobOffers: any[]}>(GET_MY_JOB_OFFERS, {
        fetchPolicy: 'cache-and-network',
    });

    const { data: myAppsData, loading: loadingMyApps, refetch: refetchMyApps } = useQuery<{myApplications: any[]}>(GET_MY_APPLICATIONS, {
        fetchPolicy: 'cache-and-network',
    });

    const { data: myServicesData, loading: loadingMyServices, refetch: refetchMyServices } = useQuery<{myProfessionalProfile: any[]}>(GET_MY_PROFESSIONAL_PROFILE, {
        fetchPolicy: 'cache-and-network',
    });

    const handleTabPress = (key: TabKey, index: number) => {
        setActiveTab(key);
        if (tabOffsets[index] !== undefined && tabWidths[index] !== undefined) {
            Animated.spring(indicatorAnim, {
                toValue: tabOffsets[index],
                useNativeDriver: false,
                tension: 68,
                friction: 10,
            }).start();
            Animated.spring(indicatorWidth, {
                toValue: tabWidths[index],
                useNativeDriver: false,
                tension: 68,
                friction: 10,
            }).start();
        }
    };

    const handleTabLayout = (index: number, width: number, x: number) => {
        setTabWidths(prev => { const n = [...prev]; n[index] = width; return n; });
        setTabOffsets(prev => { const n = [...prev]; n[index] = x; return n; });
        if (index === 0) {
            indicatorAnim.setValue(x);
            indicatorWidth.setValue(width);
        }
    };

    const isLoading = loadingOffers || loadingProfs || loadingMyOffers || loadingMyApps || loadingMyServices;

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            {activeTab === 'results' ? (
                <>
                    <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.06)' }]}>
                        <Ionicons name="folder-open-outline" size={40} color="#FF6524" style={{ opacity: 0.7 }} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {resultsTab === 'my_applications' ? 'No tienes postulaciones' : resultsTab === 'my_offers' ? 'No tienes publicaciones' : 'No tienes servicios' }
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        {resultsTab === 'my_applications' ? 'Aún no te has postulado a ninguna oferta de empleo.' : resultsTab === 'my_offers' ? 'No has publicado ninguna oferta de empleo aún.' : 'Aún no has ofrecido tus servicios.'}
                    </Text>
                    {resultsTab === 'my_offers' && (
                        <TouchableOpacity
                            style={[styles.emptyAction, { backgroundColor: '#FF6524' }]}
                            onPress={() => router.push('/jobs/create')}
                        >
                            <Ionicons name="add" size={16} color="#FFF" />
                            <Text style={styles.emptyActionText}>Crear una publicación</Text>
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                <>
                    <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.06)' }]}>
                        <Ionicons
                            name={activeTab === 'offers' ? 'briefcase-outline' : 'construct-outline'}
                            size={40}
                            color="#FF6524"
                            style={{ opacity: 0.7 }}
                        />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {activeTab === 'offers' ? 'Sin ofertas por ahora' : 'Sin profesionales aún'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        {activeTab === 'offers'
                            ? 'Sé el primero en publicar una oferta de empleo en tu comunidad.'
                            : 'Registra tu perfil profesional y comienza a recibir solicitudes.'}
                    </Text>
                </>
            )}
        </View>
    );

    const getListData = () => {
        if (activeTab === 'offers') return offersData?.jobOffers ?? [];
        if (activeTab === 'services') return profsData?.professionalProfiles ?? [];
        if (activeTab === 'results') {
            if (resultsTab === 'my_applications') return myAppsData?.myApplications ?? [];
            if (resultsTab === 'my_offers') return myOffersData?.myJobOffers ?? [];
            if (resultsTab === 'my_services') return myServicesData?.myProfessionalProfile ?? [];
        }
        return [];
    };

    const handleRefresh = () => {
        if (activeTab === 'offers') refetchOffers();
        else if (activeTab === 'services') refetchProfs();
        else if (activeTab === 'results') {
            if (resultsTab === 'my_applications') refetchMyApps();
            else if (resultsTab === 'my_offers') refetchMyOffers();
            else if (resultsTab === 'my_services') refetchMyServices();
        }
    };

    const isRefreshing = activeTab === 'offers' ? loadingOffers : activeTab === 'services' ? loadingProfs : (activeTab === 'results' && resultsTab === 'my_offers') ? loadingMyOffers : (activeTab === 'results' && resultsTab === 'my_applications') ? loadingMyApps : (activeTab === 'results' && resultsTab === 'my_services') ? loadingMyServices : false;

    const renderListHeader = () => {
        if (activeTab !== 'results') return null;
        
        const RESULT_TABS = [
            { key: 'my_applications', label: 'Mis Postulaciones', icon: 'paper-plane-outline' },
            { key: 'my_offers', label: 'Mis Ofertas', icon: 'briefcase-outline' },
            { key: 'my_services', label: 'Mis Servicios', icon: 'construct-outline' }
        ];

        return (
            <View style={styles.subTabBarContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                >
                    {RESULT_TABS.map(tab => {
                        const isActive = resultsTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[
                                    styles.chip,
                                    isActive ? styles.chipActive : [styles.chipInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]
                                ]}
                                onPress={() => setResultsTab(tab.key as ResultsTabKey)}
                                activeOpacity={0.8}
                            >
                                <Ionicons 
                                    name={tab.icon as any} 
                                    size={16} 
                                    color={isActive ? '#FFF' : colors.textSecondary} 
                                />
                                <Text style={[
                                    styles.chipLabel,
                                    { color: isActive ? '#FFF' : colors.textSecondary }
                                ]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        if (activeTab === 'offers') return <JobOfferCard item={item} onPress={() => {}} />;
        if (activeTab === 'services') return <ProfessionalCard item={item} onPress={() => {}} />;
        if (activeTab === 'results') {
            if (resultsTab === 'my_applications') {
                const getStatusColor = (status: string) => {
                    if (status === 'ACCEPTED') return '#4CAF50';
                    if (status === 'REJECTED') return '#F44336';
                    return '#FF9800'; // PENDING
                };
                const getStatusLabel = (status: string) => {
                    if (status === 'ACCEPTED') return 'Aceptada';
                    if (status === 'REJECTED') return 'Rechazada';
                    return 'Pendiente';
                };
                return (
                    <TouchableOpacity 
                        style={[styles.appCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.appCardHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.appJobTitle, { color: colors.text }]} numberOfLines={1}>
                                    {item.jobOffer?.title || 'Oferta Eliminada'}
                                </Text>
                                {item.jobOffer?.author && (
                                    <Text style={[styles.appJobCompany, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {item.jobOffer.author.firstName} {item.jobOffer.author.lastName}
                                    </Text>
                                )}
                            </View>
                            <View style={[styles.appStatusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                <Text style={[styles.appStatusText, { color: getStatusColor(item.status) }]}>
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.appCardFooter, { borderTopColor: colors.border }]}>
                            <View style={styles.appCardDateRow}>
                                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.appCardDate, { color: colors.textSecondary }]}>
                                    Postulado el {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                );
            }
            if (resultsTab === 'my_offers') {
                return (
                    <View style={styles.cardContainer}>
                        <JobOfferCard 
                            item={item} 
                            onPress={() => router.push(`/jobs/${item.id_job_offer}/applicants`)} 
                        />
                        <View style={styles.applicantsBadge}>
                            <Text style={styles.applicantsBadgeText}>Ver Postulantes</Text>
                            <Ionicons name="chevron-forward" size={14} color="#FFF" />
                        </View>
                    </View>
                );
            }
            if (resultsTab === 'my_services') {
                return <ProfessionalCard item={item} onPress={() => {}} />;
            }
        }
        return null;
    };

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>

            {/* ── Header ── */}
            <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
                <View style={styles.headerTop}>
                    <Text style={[styles.title, { color: colors.text }]}>Empleos</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.notifBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                            <Ionicons name="notifications-outline" size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Tab bar ── */}
                <View style={styles.tabBar}>
                    {TABS.map((tab, i) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={styles.tabItem}
                                onPress={() => handleTabPress(tab.key, i)}
                                activeOpacity={0.7}
                                onLayout={e => {
                                    const { width, x } = e.nativeEvent.layout;
                                    handleTabLayout(i, width, x);
                                }}
                            >
                                <Ionicons
                                    name={isActive ? tab.iconActive : tab.icon}
                                    size={18}
                                    color={isActive ? '#FF6524' : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.tabLabel,
                                    { color: isActive ? '#FF6524' : colors.textSecondary },
                                    isActive && styles.tabLabelActive,
                                ]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Animated underline indicator */}
                    <Animated.View
                        style={[
                            styles.tabIndicator,
                            {
                                left: indicatorAnim,
                                width: indicatorWidth,
                            }
                        ]}
                    />
                </View>
            </View>

            {/* ── Content ── */}
            {isLoading && !offersData && !profsData && !myOffersData ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF6524" />
                </View>
            ) : (
                <FlatList
                    data={getListData()}
                    keyExtractor={(item) => item.id_job_offer || item.id_professional_profile || item.id_job_application || item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderListHeader}
                    contentContainerStyle={[
                        styles.listContent,
                        getListData().length === 0 ? { flex: 1 } : null,
                    ]}
                    ListEmptyComponent={renderEmpty}
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ── FAB ── */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
                onPress={() => router.push('/jobs/create')}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },

    // ── Header ──
    header: {
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingBottom: 0,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    notifBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Tab Bar ──
    tabBar: {
        flexDirection: 'row',
        position: 'relative',
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    tabLabelActive: {
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 2.5,
        backgroundColor: '#FF6524',
        borderRadius: 2,
    },

    // ── Content ──
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 100,
    },
    
    // ── Sub Tab Bar ──
    subTabBarContainer: {
        marginTop: 12,
        marginBottom: 16,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    chipActive: {
        backgroundColor: '#FF6524',
        shadowColor: '#FF6524',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    chipInactive: {
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipLabel: {
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Application Card ──
    appCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
            },
            android: { elevation: 2 },
        }),
    },
    appCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    appJobTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    appJobCompany: {
        fontSize: 13,
    },
    appStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        marginLeft: 12,
    },
    appStatusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    appCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    appCardDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    appCardDate: {
        fontSize: 12,
    },

    // ── Card Adjustments ──
    cardContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    applicantsBadge: {
        position: 'absolute',
        top: 24,
        right: 24,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        elevation: 4,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        zIndex: 10,
    },
    applicantsBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },

    // ── Empty State ──
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
        minHeight: 300,
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
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    emptyActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },

    // ── FAB ──
    fab: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#FF6524',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        zIndex: 10,
    },
});
