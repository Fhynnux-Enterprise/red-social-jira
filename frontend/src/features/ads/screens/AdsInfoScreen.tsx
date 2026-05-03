import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function AdsInfoScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleWhatsApp = () => {
        const phone = process.env.EXPO_PUBLIC_ADMIN_PHONE || '593999999999';
        const message = 'Hola, estoy interesado en publicar un anuncio local en la aplicación.';
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir WhatsApp' });
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Anúnciate con Nosotros</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 101, 36, 0.1)' }]}>
                        <Ionicons name="megaphone" size={60} color="#FF6524" />
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Impulsa tu negocio local</Text>
                    <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                        Conecta con cientos de clientes potenciales en tu cantón y haz crecer tus ventas de manera directa.
                    </Text>
                </View>

                {/* Benefits Section */}
                <View style={styles.benefitsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>¿Por qué anunciarte aquí?</Text>

                    <View style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.benefitIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.12)' }]}>
                            <Ionicons name="eye" size={28} color="#4CAF50" />
                        </View>
                        <View style={styles.benefitTextContainer}>
                            <Text style={[styles.benefitTitle, { color: colors.text }]}>Máxima Visibilidad</Text>
                            <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                                Tu anuncio aparecerá en el feed principal de nuestra comunidad, intercalado orgánicamente entre las publicaciones.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.benefitIconContainer, { backgroundColor: 'rgba(33, 150, 243, 0.12)' }]}>
                            <Ionicons name="color-palette" size={28} color="#2196F3" />
                        </View>
                        <View style={styles.benefitTextContainer}>
                            <Text style={[styles.benefitTitle, { color: colors.text }]}>Diseño Atractivo</Text>
                            <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                                Mostramos tu marca con imágenes en alta calidad, descripciones detalladas y un botón de llamada a la acción directo.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.benefitIconContainer, { backgroundColor: 'rgba(156, 39, 176, 0.12)' }]}>
                            <Ionicons name="analytics" size={28} color="#9C27B0" />
                        </View>
                        <View style={styles.benefitTextContainer}>
                            <Text style={[styles.benefitTitle, { color: colors.text }]}>Público Objetivo</Text>
                            <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                                Llega directamente a los residentes y personas interesadas en el cantón, optimizando tu inversión.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Pricing Section */}
                <View style={styles.pricingContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Plan de Publicidad</Text>
                    <View style={[styles.pricingCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                        <View style={styles.priceTag}>
                            <Text style={styles.priceValue}>$10</Text>
                            <Text style={styles.pricePeriod}>por plan</Text>
                        </View>
                        <View style={styles.priceDivider} />
                        <View style={styles.pricingFeatures}>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={[styles.featureText, { color: colors.text }]}>Hasta 5 publicaciones activas</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={[styles.featureText, { color: colors.text }]}>Estadísticas básicas de clics</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={[styles.featureText, { color: colors.text }]}>Soporte para cambios</Text>
                            </View>
                        </View>
                    </View>
                </View>
                
                {/* How it works */}
                <View style={styles.howItWorksContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>¿Cómo funciona?</Text>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                        1. Toca el botón de WhatsApp abajo para contactarnos.{'\n'}
                        2. Compártenos la imagen, el texto de tu anuncio y el enlace a donde quieres dirigir a los clientes (tu web, Facebook, WhatsApp, etc).{'\n'}
                        3. Elegimos el plan que mejor se adapte a ti.{'\n'}
                        4. ¡Tu anuncio estará activo para toda la comunidad!
                    </Text>
                </View>
            </ScrollView>

            {/* Footer with Call to Action */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity style={styles.ctaButton} onPress={handleWhatsApp} activeOpacity={0.85}>
                    <Ionicons name="logo-whatsapp" size={24} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.ctaText}>Contactar por WhatsApp</Text>
                </TouchableOpacity>
            </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    heroContainer: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 12,
    },
    heroSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    benefitsContainer: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    benefitCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        alignItems: 'center',
    },
    benefitIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    benefitTextContainer: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    benefitDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    howItWorksContainer: {
        marginBottom: 20,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 26,
    },
    footer: {
        padding: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    ctaButton: {
        backgroundColor: '#25D366',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    pricingContainer: {
        marginBottom: 30,
    },
    pricingCard: {
        borderRadius: 24,
        borderWidth: 2,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    priceTag: {
        alignItems: 'center',
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FF6524',
    },
    pricePeriod: {
        fontSize: 14,
        color: '#888',
        marginTop: -8,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    priceDivider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(128, 128, 128, 0.15)',
        marginVertical: 20,
    },
    pricingFeatures: {
        width: '100%',
        gap: 14,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
