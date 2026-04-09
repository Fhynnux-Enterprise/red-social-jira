
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import ApplyJobModal from './ApplyJobModal';
import ImageCarousel from '../../feed/components/ImageCarousel';

interface JobOfferCardProps {
    item: any;
    onPress: () => void;
}

export default function JobOfferCard({ item, onPress }: JobOfferCardProps) {
    const { colors } = useTheme();
    const router = useRouter();
    const authContext = useAuth() as any;
    const [modalVisible, setModalVisible] = useState(false);
    
    const isOwner = authContext?.user?.id === item.author?.id;

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    };

    const goToProfile = () => {
        const profileUserId = item.author?.id === authContext?.user?.id ? undefined : item.author?.id;
        router.push({ pathname: '/profile', params: { userId: profileUserId } });
    };

    const [cardWidth, setCardWidth] = useState(Dimensions.get('window').width - 32);

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onPress}
                activeOpacity={0.7}
                onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
            >
                {/* ── Cabecera Superior (Banner Ancho Completo) ── */}
                {/* ── Cabecera Superior (Outline Grande Centrado) ── */}
                <View style={styles.topBadgeWrapper}>
                    <View style={styles.topOutlineBanner}>
                        <View style={styles.topOutlineContent}>
                            <Ionicons name="briefcase-outline" size={14} color="#FF6524" style={{ marginRight: 8 }} />
                            <Text style={styles.topOutlineText}>Oferta de Empleo</Text>
                        </View>
                        {isOwner && (
                            <TouchableOpacity 
                                onPress={() => {/* Lógica futura de edición */}} 
                                style={styles.topOutlineEllipsis}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color="#FF6524" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={[styles.contentPadding, { paddingBottom: 10, paddingTop: 4 }]}>

                    {/* ── Encabezado: título + fecha ── */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>

                    {/* ── Ubicación ── */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="#FF6524" />
                        <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                            {item.location}
                        </Text>
                    </View>

                    {/* ── Descripción ── */}
                    <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.description}
                    </Text>

                    {/* ── Autor + Salario (debajo de descripción) ── */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.authorRow} onPress={goToProfile} activeOpacity={0.7}>
                            <View style={styles.avatarWrap}>
                                {item.author?.photoUrl ? (
                                    <Image source={{ uri: item.author.photoUrl }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={styles.avatarInitials}>
                                        {item.author?.firstName?.[0] || ''}{item.author?.lastName?.[0] || ''}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                                {item.author?.firstName} {item.author?.lastName}
                            </Text>
                        </TouchableOpacity>

                        {/* ── Salario ── */}
                        {item.salary && (
                            <View style={styles.salaryBadge}>
                                <Ionicons name="wallet-outline" size={16} color="#4CAF50" />
                                <Text style={[styles.salary, { color: '#4CAF50' }]} numberOfLines={1}>
                                    ${item.salary.replace(/\$/g, '')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Carrusel Multimedia (1:1 Cuadrado) ── */}
                {item.media && item.media.length > 0 && (
                    <View style={{ width: '100%', backgroundColor: colors.surface }}>
                        <ImageCarousel
                            media={item.media}
                            containerWidth={cardWidth}
                            customAspectRatio={1}
                            disableFullscreen={true}
                        />
                    </View>
                )}

                {/* ── Botón Postularme (Extra ancho) ── */}
                <View style={styles.applyBtnWrapper}>
                    <TouchableOpacity
                        style={styles.applyBtn}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="paper-plane-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.applyBtnText}>Postularme</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {/* ── Modal de postulación ── */}
            <ApplyJobModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                jobOffer={item}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
            },
            android: { elevation: 3 },
        }),
    },
    contentPadding: {
        paddingBottom: 16,
        paddingRight: 16,
        paddingLeft: 2,
    },
    topBadgeWrapper: {
        width: '100%',
        paddingTop: 12,
        paddingBottom: 12,
        /* 👇 AQUÍ MODIFICAS EL ANCHO DEL LABEL SUPERIOR 👇 */
        /* Si lo pones en 0 será de extremo a extremo. Si le subes (ej: 20) se hará más angosto. */
        paddingHorizontal: 2, 
    },
    topOutlineBanner: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FF6524',
        position: 'relative',
    },
    topOutlineContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topOutlineText: {
        color: '#FF6524',
        fontSize: 14,
        fontWeight: '700',
    },
    topOutlineEllipsis: {
        position: 'absolute',
        right: 12,
    },
    header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
},
    title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
},
    date: {
    fontSize: 12,
},
    locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
},
    locationText: {
    fontSize: 13,
    marginLeft: 4,
},
    description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
},
    footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
},
    authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
},
    avatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,101,36,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
},
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: {
    color: '#FF6524',
    fontSize: 10,
    fontWeight: '700',
},
    authorName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
},
    salaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        paddingHorizontal: 0,
        paddingVertical: 6,
        borderRadius: 12,
        flexShrink: 0,
        maxWidth: Dimensions.get('window').width * 0.35,
    },
    salary: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 4,
        flexShrink: 1,
    },
    applyBtnWrapper: {
        paddingTop: 10,
        paddingHorizontal: 2,
    },
    applyBtn: {
        width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FF6524',
},
    applyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
},
});
