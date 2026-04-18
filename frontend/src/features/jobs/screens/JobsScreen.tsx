import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Platform, FlatList, ActivityIndicator, Animated, ScrollView, Pressable, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_JOB_OFFERS, GET_PROFESSIONALS, GET_MY_JOB_OFFERS, GET_MY_APPLICATIONS, GET_MY_PROFESSIONAL_PROFILE, DELETE_APPLICATION } from '../graphql/jobs.operations';
import JobOfferCard from '../components/JobOfferCard';
import ProfessionalCard from '../components/ProfessionalCard';
import ApplyJobModal from '../components/ApplyJobModal';
import PostOptionsModal from '../../feed/components/PostOptionsModal';
import { DELETE_JOB_OFFER, DELETE_PROFESSIONAL_PROFILE } from '../graphql/jobs.operations';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import CommentsModal from '../../comments/components/CommentsModal';
import ListFooter from '../../../components/ListFooter';
import { useFocusEffect } from '@react-navigation/native';

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
    const [fabOpen, setFabOpen] = useState(false);
    const fabAnim = useRef(new Animated.Value(0)).current;
    const [tabWidths, setTabWidths] = useState<number[]>([]);
    const [tabOffsets, setTabOffsets] = useState<number[]>([]);
    const indicatorAnim = useRef(new Animated.Value(0)).current;
    const indicatorWidth = useRef(new Animated.Value(0)).current;

    const [selectedApplication, setSelectedApplication] = useState<any>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [selectedItemForOptions, setSelectedItemForOptions] = useState<any>(null);
    const resumeCommentsRef = useRef<any>(null);

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

    const [appMenuVisible, setAppMenuVisible] = useState<any>(null);
    const [editAppVisible, setEditAppVisible] = useState<any>(null);
    const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
    
    const [deleteApplication, { loading: deletingApp }] = useMutation(DELETE_APPLICATION, {
        refetchQueries: [{ query: GET_MY_APPLICATIONS }],
        onCompleted: () => {
            setDeleteAppId(null);
            setAppMenuVisible(null);
            Toast.show({ type: 'success', text1: 'Postulación eliminada' });
        },
        onError: (err) => {
            setDeleteAppId(null);
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        }
    });

    const [deleteJobOffer] = useMutation(DELETE_JOB_OFFER, {
        onCompleted: () => {
            setIsOptionsVisible(false);
            Toast.show({ type: 'success', text1: 'Oferta eliminada' });
            refetchOffers();
            refetchMyOffers();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message })
    });

    const [deleteProfessional] = useMutation(DELETE_PROFESSIONAL_PROFILE, {
        onCompleted: () => {
            setIsOptionsVisible(false);
            Toast.show({ type: 'success', text1: 'Servicio eliminado' });
            refetchProfs();
            refetchMyServices();
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message })
    });

    const handleOptionsPress = (item: any) => {
        setSelectedItemForOptions(item);
        setIsOptionsVisible(true);
    };

    const handleDelete = () => {
        if (!selectedItemForOptions?.id) return;
        if (selectedItemForOptions.__typename === 'JobOffer') {
            deleteJobOffer({ variables: { id: selectedItemForOptions.id } });
        } else if (selectedItemForOptions.__typename === 'ProfessionalProfile') {
            deleteProfessional({ variables: { id: selectedItemForOptions.id } });
        }
    };

    const handleEdit = (item: any) => {
        setIsOptionsVisible(false);
        if (selectedPostForComments) {
            resumeCommentsRef.current = selectedPostForComments;
            setSelectedPostForComments(null);
        }
        setTimeout(() => {
            if (item.__typename === 'JobOffer') {
                router.push({ pathname: '/jobs/create', params: { initialTab: 'offer', editId: item.id, editData: JSON.stringify(item) } });
            } else {
                router.push({ pathname: '/jobs/create', params: { initialTab: 'service', editId: item.id, editData: JSON.stringify(item) } });
            }
        }, 150);
    };

    useFocusEffect(
        useCallback(() => {
            if (resumeCommentsRef.current) {
                const timer = setTimeout(() => {
                    setSelectedPostForComments(resumeCommentsRef.current);
                    resumeCommentsRef.current = null;
                }, 300);
                return () => clearTimeout(timer);
            }
        }, [])
    );


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

    const toggleFab = () => {
        if (fabOpen) {
            // Cerrar: timing limpio, sin rebote
            Animated.timing(fabAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }).start();
        } else {
            // Abrir: spring con rebote
            Animated.spring(fabAnim, {
                toValue: 1,
                useNativeDriver: true,
                bounciness: 8,
                speed: 14,
            }).start();
        }
        setFabOpen(!fabOpen);
    };

    const handleFabOption = (type: 'offer' | 'service') => {
        setFabOpen(false);
        Animated.timing(fabAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        router.push({ pathname: '/jobs/create', params: { initialTab: type } });
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

    const commentsModalData = React.useMemo(() => {
        if (!selectedPostForComments) return { post: null, nextPost: null, prevPost: null };
        
        const currentData = getListData();
        const currentIndex = currentData.findIndex((p: any) => p.id === selectedPostForComments.post?.id);
        const livePost = currentIndex !== -1 ? currentData[currentIndex] : selectedPostForComments.post;

        let nextPost = null;
        if (currentIndex !== -1 && currentIndex < currentData.length - 1) {
            nextPost = { ...currentData[currentIndex + 1] };
        }

        let prevPost = null;
        if (currentIndex > 0) {
            prevPost = { ...currentData[currentIndex - 1] };
        }

        let defaultTypeName = 'JobOffer';
        if (activeTab === 'services' || (activeTab === 'results' && resultsTab === 'my_services')) {
            defaultTypeName = 'ProfessionalProfile';
        }

        return {
            post: { ...livePost, __typename: livePost.__typename || defaultTypeName },
            nextPost,
            prevPost,
        };
    }, [selectedPostForComments, activeTab, resultsTab, offersData, profsData, myOffersData, myAppsData, myServicesData]);

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
        const openInModal = () => setSelectedPostForComments({ post: item, minimize: true, initialTab: 'comments' });

        if (activeTab === 'offers') return <JobOfferCard item={item} onPress={openInModal} onEdit={handleEdit} />;
        if (activeTab === 'services') return <ProfessionalCard item={item} onPress={openInModal} onEdit={handleEdit} />;
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
                        onPress={() => item.jobOffer && setSelectedApplication(item)}
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
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.appStatusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                    <Text style={[styles.appStatusText, { color: getStatusColor(item.status) }]}>
                                        {getStatusLabel(item.status)}
                                    </Text>
                                </View>
                                {item.status === 'PENDING' && (
                                    <TouchableOpacity
                                        style={{ padding: 4, marginLeft: 8 }}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setAppMenuVisible(item);
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
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
                    <JobOfferCard
                        item={item}
                        onPress={openInModal}
                        onEdit={handleEdit}
                    />
                );
            }

            if (resultsTab === 'my_services') {
                return <ProfessionalCard item={item} onPress={openInModal} onEdit={handleEdit} />;
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
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderListHeader}
                    contentContainerStyle={[
                        styles.listContent,
                        getListData().length === 0 ? { flex: 1 } : null,
                    ]}
                    ListFooterComponent={getListData().length > 0 ? <ListFooter /> : null}
                    ListEmptyComponent={renderEmpty}
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ── FAB Overlay (cierra el menú al tocar fuera) ── */}
            {fabOpen && (
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={toggleFab}
                />
            )}

            {/* ── FAB Speed-Dial ── */}
            <View
                style={[styles.fabContainer, { bottom: insets.bottom + -35 }]}
                pointerEvents="box-none"
            >
                {/* Opciones (apiladas en columna sobre el FAB) */}
                <Animated.View
                    style={{
                        opacity: fabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                            extrapolate: 'clamp',
                        }),
                        transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0], extrapolate: 'clamp' }) }],
                        alignItems: 'flex-end',
                        gap: 12,
                        marginBottom: 14,
                        marginRight: 6,
                    }}
                    pointerEvents={fabOpen ? 'auto' : 'none'}
                >
                    {/* Opción: Publicar Oferta */}
                    <TouchableOpacity
                        style={styles.fabOptionRow}
                        onPress={() => handleFabOption('offer')}
                        activeOpacity={0.8}
                    >
                        <View style={[
                            styles.fabOptionLabelWrap,
                            activeTab === 'offers' && styles.fabOptionLabelActive
                        ]}>
                            <Text style={[
                                styles.fabOptionLabel,
                                { color: activeTab === 'offers' ? '#FFF' : '#EEE' }
                            ]}>
                                Publicar Oferta
                            </Text>
                        </View>
                        <View style={[
                            styles.fabMini,
                            activeTab === 'offers' ? styles.fabMiniPrimary : styles.fabMiniSecondary
                        ]}>
                            <Ionicons name="briefcase-outline" size={20} color="#FFF" />
                        </View>
                    </TouchableOpacity>

                    {/* Opción: Publicar Servicio */}
                    <TouchableOpacity
                        style={styles.fabOptionRow}
                        onPress={() => handleFabOption('service')}
                        activeOpacity={0.8}
                    >
                        <View style={[
                            styles.fabOptionLabelWrap,
                            activeTab === 'services' && styles.fabOptionLabelActive
                        ]}>
                            <Text style={[
                                styles.fabOptionLabel,
                                { color: activeTab === 'services' ? '#FFF' : '#EEE' }
                            ]}>
                                Publicar Servicio
                            </Text>
                        </View>
                        <View style={[
                            styles.fabMini,
                            activeTab === 'services' ? styles.fabMiniPrimary : styles.fabMiniSecondary
                        ]}>
                            <Ionicons name="construct-outline" size={20} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* Botón principal FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={toggleFab}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.fabGradient}
                    >
                        <Animated.View style={{
                            transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }]
                        }}>
                            <Ionicons name="add" size={30} color="#FFF" />
                        </Animated.View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Modal para ver detalles de la oferta de la postulación */}
            <Modal
                visible={!!selectedApplication}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedApplication(null)}
            >
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                        <TouchableOpacity onPress={() => setSelectedApplication(null)}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                            Detalle de Publicación
                        </Text>
                        <View style={{ width: 28 }} />
                    </View>
                    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}>
                        {selectedApplication?.jobOffer && (
                            <JobOfferCard item={selectedApplication.jobOffer} onPress={() => {}} />
                        )}
                        
                        {/* Detalles de la postulación enviada */}
                        {selectedApplication && (
                            <View style={{ padding: 20, paddingTop: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Ionicons name="paper-plane" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Tu Postulación</Text>
                                </View>

                                {selectedApplication.message ? (
                                    <View style={{ backgroundColor: isDark ? 'rgba(255,101,36,0.05)' : 'rgba(255,101,36,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
                                        <Text style={{ color: colors.text }} leading={22}>{selectedApplication.message}</Text>
                                    </View>
                                ) : (
                                    <Text style={{ color: colors.textSecondary, fontStyle: 'italic', marginBottom: 16 }}>No enviaste una carta de presentación.</Text>
                                )}

                                {selectedApplication.contactPhone && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 14, marginBottom: 16 }}>
                                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(37,211,102,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="call" size={22} color="#25D366" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Teléfono de contacto</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{selectedApplication.contactPhone}</Text>
                                        </View>
                                    </View>
                                )}

                                {selectedApplication.cvUrl && (
                                    <TouchableOpacity 
                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 14 }}
                                        onPress={async () => {
                                            const { Linking } = await import('react-native');
                                            Linking.openURL(selectedApplication.cvUrl);
                                        }}
                                    >
                                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,101,36,0.12)', justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="document-text" size={22} color="#FF6524" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Ver Hoja de Vida</Text>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>PDF adjuntado</Text>
                                        </View>
                                        <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Menu de opciones postulación */}
            <Modal
                visible={!!appMenuVisible && !deleteAppId}
                transparent
                animationType="fade"
                onRequestClose={() => setAppMenuVisible(null)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setAppMenuVisible(null)}
                >
                    <View style={{ backgroundColor: colors.surface, padding: 20, paddingBottom: Math.max(insets.bottom, 16) + 16, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                        
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginBottom: 16, textAlign: 'center' }}>
                            Opciones de la postulación
                        </Text>
                        
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                            onPress={() => {
                                setEditAppVisible(appMenuVisible);
                                setAppMenuVisible(null);
                            }}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,101,36,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                                <Ionicons name="create-outline" size={20} color="#FF6524" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Editar postulación</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Modificar mensaje y CV</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
                            onPress={() => {
                                setDeleteAppId(appMenuVisible.id);
                            }}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,67,54,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                                <Ionicons name="trash-outline" size={20} color="#F44336" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#F44336' }}>Eliminar postulación</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Esta acción no se puede deshacer</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal Confirmar Eliminación */}
            <Modal
                visible={!!deleteAppId}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteAppId(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ width: '100%', backgroundColor: colors.surface, borderRadius: 24, padding: 28, alignItems: 'center' }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(244,67,54,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="trash" size={32} color="#F44336" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10 }}>¿Eliminar postulación?</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 20 }}>
                            Si retiras tu postulación ya no aparecerás en la lista del empleador.{'\n'}Podrás volver a postularte mientras la vacante siga abierta.
                        </Text>
                        
                        <View style={{ width: '100%', flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center' }}
                                onPress={() => setDeleteAppId(null)}
                                disabled={deletingApp}
                            >
                                <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F44336', alignItems: 'center' }}
                                onPress={() => deleteApplication({ variables: { applicationId: deleteAppId } })}
                                disabled={deletingApp}
                            >
                                {deletingApp ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ fontWeight: '700', fontSize: 15, color: '#FFF' }}>Sí, Eliminar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal para Editar Postulación */}
            <ApplyJobModal 
                visible={!!editAppVisible}
                applicationToEdit={editAppVisible}
                jobOffer={editAppVisible?.jobOffer || null}
                onClose={() => setEditAppVisible(null)}
            />

            {/* ── Comments Modal ── */}
            <CommentsModal
                visible={!!selectedPostForComments}
                post={commentsModalData.post}
                onClose={() => setSelectedPostForComments(null)}
                initialMinimized={selectedPostForComments?.minimize ?? false}
                initialTab={selectedPostForComments?.initialTab ?? 'comments'}
                onNextPost={() => {
                    if (commentsModalData.nextPost) {
                        setSelectedPostForComments((prev: any) => ({ ...prev, post: commentsModalData.nextPost }));
                    }
                }}
                onPrevPost={() => {
                    if (commentsModalData.prevPost) {
                        setSelectedPostForComments((prev: any) => ({ ...prev, post: commentsModalData.prevPost }));
                    }
                }}
                onOptionsPress={handleOptionsPress}
                nextPost={commentsModalData.nextPost}
                prevPost={commentsModalData.prevPost}
            />

            <PostOptionsModal
                visible={isOptionsVisible}
                onClose={() => setIsOptionsVisible(false)}
                onEdit={() => handleEdit(selectedItemForOptions)}
                onDelete={handleDelete}
            />
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

    // ── FAB (Floating Action Button Speed-Dial) ──
    fabContainer: {
        position: 'absolute',
        right: 26,
        alignItems: 'flex-end',
        zIndex: 20,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        elevation: 6,
        shadowColor: '#FF6524',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabMini: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    fabMiniPrimary: {
        backgroundColor: '#FF6524',
        shadowColor: '#FF6524',
    },
    fabMiniSecondary: {
        backgroundColor: '#888',
        shadowColor: '#000',
    },
    fabOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fabOptionLabelWrap: {
        backgroundColor: 'rgba(30,30,30,0.82)',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    fabOptionLabelActive: {
        backgroundColor: '#FF6524',
    },
    fabOptionLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
});
