import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, TouchableOpacity,
    StatusBar, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AppealModal from '../../notifications/components/AppealModal';

const { width } = Dimensions.get('window');

interface BannedScreenProps {
    bannedUntil: string;
    banReason: string;
    onSignOut: () => void;
}

export default function BannedScreen({ bannedUntil, banReason, onSignOut }: BannedScreenProps) {
    // ── Animations ────────────────────────────────────────────────────────────
    const fadeAnim   = useRef(new Animated.Value(0)).current;
    const slideAnim  = useRef(new Animated.Value(40)).current;
    const pulseAnim  = useRef(new Animated.Value(1)).current;
    const glowAnim   = useRef(new Animated.Value(0)).current;
    const shakeAnim  = useRef(new Animated.Value(0)).current;
    const ringAnim   = useRef(new Animated.Value(1)).current;

    const [isAppealModalVisible, setAppealModalVisible] = React.useState(false);

    const isPermanent = (() => {
        const until = new Date(bannedUntil);
        const diffDays = (until.getTime() - Date.now()) / 86400000;
        return diffDays > 300;
    })();

    const banDate = new Date(bannedUntil);

    const formattedDate = isPermanent
        ? 'Sin fecha de expiración'
        : banDate.toLocaleDateString('es-EC', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          });

    const formattedTime = isPermanent
        ? ''
        : banDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

    // Days remaining
    const daysLeft = isPermanent ? null : Math.ceil((banDate.getTime() - Date.now()) / 86400000);

    useEffect(() => {
        // Entrance
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start(() => {
            // Shake
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 12, duration: 70, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -12, duration: 70, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
        });

        // Pulse loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();

        // Glow loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
            ])
        ).start();

        // Ripple ring loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
                Animated.timing(ringAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] });
    const ringOpacity = ringAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.5, 0] });

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0208" />

            {/* Deep dark background */}
            <LinearGradient
                colors={['#0D0208', '#180410', '#0D0208']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Ambient red glow top */}
            <Animated.View style={[styles.ambientGlow, { opacity: glowOpacity }]}>
                <LinearGradient
                    colors={['#7F1D1D', 'transparent']}
                    style={{ flex: 1 }}
                />
            </Animated.View>

            {/* Subtle grid pattern */}
            <View style={styles.gridOverlay} pointerEvents="none" />

            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* ── Icon section ── */}
                    <View style={styles.iconSection}>
                        {/* Ripple ring */}
                        <Animated.View style={[
                            styles.rippleRing,
                            {
                                opacity: ringOpacity,
                                transform: [{ scale: ringAnim }],
                            },
                        ]} />

                        {/* Icon glow backdrop */}
                        <Animated.View style={[styles.iconGlowBg, { transform: [{ scale: pulseAnim }] }]} />

                        <Animated.View style={[
                            styles.iconWrapper,
                            { transform: [{ translateX: shakeAnim }, { scale: pulseAnim }] },
                        ]}>
                            <LinearGradient
                                colors={['#7F1D1D', '#DC2626', '#EF4444']}
                                style={styles.iconGradient}
                            >
                                <Ionicons name={isPermanent ? 'ban' : 'lock-closed'} size={48} color="#FFF" />
                            </LinearGradient>
                        </Animated.View>

                        {/* Type badge */}
                        <View style={[
                            styles.typeBadge,
                            { backgroundColor: isPermanent ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.18)' },
                        ]}>
                            <Ionicons
                                name={isPermanent ? 'warning' : 'time'}
                                size={11}
                                color={isPermanent ? '#EF4444' : '#F59E0B'}
                            />
                            <Text style={[styles.typeBadgeText, { color: isPermanent ? '#EF4444' : '#F59E0B' }]}>
                                {isPermanent ? 'SUSPENSIÓN PERMANENTE' : 'SUSPENSIÓN TEMPORAL'}
                            </Text>
                        </View>
                    </View>

                    {/* ── Headline ── */}
                    <Animated.View style={[styles.headline, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.title}>Cuenta suspendida</Text>
                        <Text style={styles.subtitle}>
                            {isPermanent
                                ? 'Tu acceso ha sido revocado\npermanentemente por el equipo de moderación.'
                                : 'Tu acceso está suspendido\nhasta la fecha indicada a continuación.'}
                        </Text>
                    </Animated.View>

                    {/* ── Info cards ── */}
                    <Animated.View style={[styles.cardsArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                        {/* Duration card */}
                        <View style={styles.infoCard}>
                            <LinearGradient
                                colors={['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.04)']}
                                style={StyleSheet.absoluteFillObject}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.infoCardInner}>
                                <View style={styles.infoCardIcon}>
                                    <Ionicons name={isPermanent ? 'ban-outline' : 'calendar-outline'} size={20} color="#EF4444" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.infoCardLabel}>
                                        {isPermanent ? 'Tipo de suspensión' : 'Suspendido hasta'}
                                    </Text>
                                    <Text style={styles.infoCardValue}>
                                        {isPermanent ? 'Indefinida' : formattedDate}
                                    </Text>
                                    {!isPermanent && formattedTime ? (
                                        <Text style={styles.infoCardSub}>a las {formattedTime}</Text>
                                    ) : null}
                                </View>
                                {!isPermanent && daysLeft !== null && (
                                    <View style={styles.daysLeftBadge}>
                                        <Text style={styles.daysLeftNum}>{daysLeft}</Text>
                                        <Text style={styles.daysLeftLabel}>días</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Reason card */}
                        <View style={[styles.infoCard, { marginTop: 10 }]}>
                            <LinearGradient
                                colors={['rgba(239,68,68,0.08)', 'rgba(239,68,68,0.02)']}
                                style={StyleSheet.absoluteFillObject}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.infoCardInner}>
                                <View style={styles.infoCardIcon}>
                                    <Ionicons name="document-text-outline" size={20} color="#F87171" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.infoCardLabel}>Motivo de la sanción</Text>
                                    <Text style={styles.infoCardReason}>{banReason}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Advisory note */}
                        <View style={styles.advisory}>
                            <Ionicons name="information-circle" size={18} color="#F59E0B" style={{ marginTop: 1 }} />
                            <Text style={styles.advisoryText}>
                                {isPermanent
                                    ? 'Si crees que esta sanción es un error, contacta al equipo de moderación a través de los canales de soporte oficiales.'
                                    : 'Cuando la suspensión expire podrás iniciar sesión normalmente. Revisa las Normas de la Comunidad para evitar futuras sanciones.'}
                            </Text>
                        </View>
                    </Animated.View>

                    {/* ── Appeal button ── */}
                    <Animated.View style={{ opacity: fadeAnim, width: '100%', marginBottom: 12 }}>
                        <TouchableOpacity
                            style={[styles.signOutBtn, { borderColor: 'rgba(245,158,11,0.3)' }]}
                            onPress={() => setAppealModalVisible(true)}
                            activeOpacity={0.75}
                        >
                            <LinearGradient
                                colors={['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.08)']}
                                style={StyleSheet.absoluteFillObject}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Ionicons name="scale-outline" size={20} color="#F59E0B" />
                            <Text style={[styles.signOutText, { color: '#F59E0B' }]}>Apelar Suspensión</Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(245,158,11,0.5)" />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ── Sign out button ── */}
                    <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
                        <TouchableOpacity
                            style={styles.signOutBtn}
                            onPress={onSignOut}
                            activeOpacity={0.75}
                        >
                            <LinearGradient
                                colors={['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.08)']}
                                style={StyleSheet.absoluteFillObject}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                            <Text style={styles.signOutText}>Cerrar sesión</Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(239,68,68,0.5)" />
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>

            {/* Modal de Apelación */}
            <AppealModal
                visible={isAppealModalVisible}
                onClose={() => setAppealModalVisible(false)}
                appealType="ACCOUNT_BAN"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0D0208' },
    safeArea: { flex: 1 },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 22,
        paddingBottom: 16,
        alignItems: 'center',
    },
    ambientGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 260,
    },
    gridOverlay: {
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
    },

    // ── Icon section ─────────────────────────────────────────────────────────
    iconSection: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 36,
        marginBottom: 28,
        height: 160,
    },
    rippleRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: 'rgba(239,68,68,0.4)',
    },
    iconGlowBg: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(239,68,68,0.15)',
    },
    iconWrapper: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 20,
    },
    iconGradient: {
        width: 108,
        height: 108,
        borderRadius: 54,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.25)',
        marginTop: 14,
    },
    typeBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },

    // ── Headline ─────────────────────────────────────────────────────────────
    headline: {
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.8,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: '#F87171',
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.9,
    },

    // ── Cards ─────────────────────────────────────────────────────────────────
    cardsArea: { width: '100%', marginBottom: 24 },
    infoCard: {
        width: '100%',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        overflow: 'hidden',
    },
    infoCardInner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        padding: 16,
    },
    infoCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239,68,68,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    infoCardLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F87171',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    infoCardValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'capitalize',
        lineHeight: 22,
    },
    infoCardSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 3,
    },
    infoCardReason: {
        fontSize: 14,
        color: '#FCA5A5',
        lineHeight: 21,
    },
    daysLeftBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        minWidth: 52,
    },
    daysLeftNum: {
        fontSize: 22,
        fontWeight: '900',
        color: '#EF4444',
        lineHeight: 26,
    },
    daysLeftLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(239,68,68,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    advisory: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 10,
        backgroundColor: 'rgba(245,158,11,0.07)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.18)',
        padding: 14,
    },
    advisoryText: {
        flex: 1,
        fontSize: 12.5,
        color: '#FCD34D',
        lineHeight: 19,
        opacity: 0.9,
    },

    // ── Sign out ──────────────────────────────────────────────────────────────
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(239,68,68,0.3)',
        overflow: 'hidden',
    },
    signOutText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#EF4444',
        textAlign: 'center',
    },
});
