import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_AD_FREQUENCY, UPDATE_AD_FREQUENCY, GET_AD_PROBABILITY, UPDATE_AD_PROBABILITY } from '../../ads/graphql/ads.operations';

export default function AdminAdsConfig() {
    const { colors, isDark } = useTheme();
    const [adFrequency, setAdFrequency] = useState(5);
    const [adProbability, setAdProbability] = useState(70);

    const { data: dataFreq, loading: loadingFreq } = useQuery(GET_AD_FREQUENCY, {
        fetchPolicy: 'network-only',
    });

    const { data: dataProb, loading: loadingProb, refetch: refetchProb } = useQuery(GET_AD_PROBABILITY, {
        fetchPolicy: 'network-only',
    });

    React.useEffect(() => {
        if (dataFreq?.getAdFrequency !== undefined) {
            setAdFrequency(dataFreq.getAdFrequency);
        }
    }, [dataFreq]);

    React.useEffect(() => {
        if (dataProb?.getAdProbability !== undefined) {
            setAdProbability(dataProb.getAdProbability);
        }
    }, [dataProb]);

    const [updateAdFrequency, { loading: updating }] = useMutation(UPDATE_AD_FREQUENCY, {
        refetchQueries: [{ query: GET_AD_FREQUENCY }],
        onCompleted: () => Toast.show({ type: 'success', text1: 'Configuración guardada' }),
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    const [updateAdProbability, { loading: updatingProb }] = useMutation(UPDATE_AD_PROBABILITY, {
        refetchQueries: [{ query: GET_AD_PROBABILITY }],
        onCompleted: () => Toast.show({ type: 'success', text1: 'Configuración guardada' }),
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: err.message }),
    });

    if (loadingFreq || loadingProb) {
        return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    }

    return (
        <View style={{ padding: 20 }}>
            <Text style={styles.mainSectionTitle}>Publicidad y Algoritmo</Text>
            
            {/* ── Sección: Frecuencia ── */}
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
                        <Ionicons name="megaphone-outline" size={24} color="#6366F1" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frecuencia en Feed</Text>
                        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Cada cuántos posts aparece publicidad</Text>
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[
                                styles.input,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, color: colors.text }
                            ]}
                            value={adFrequency.toString()}
                            onChangeText={(val) => {
                                const num = parseInt(val || '0', 10);
                                setAdFrequency(isNaN(num) ? 0 : num);
                            }}
                            keyboardType="number-pad"
                            placeholder="Ej: 5"
                            placeholderTextColor={colors.textSecondary}
                        />
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: updating ? 0.7 : 1 }]}
                            onPress={() => {
                                if (adFrequency < 1) {
                                    Toast.show({ type: 'error', text1: 'Error', text2: 'Ingresa un número mayor a 0' });
                                    return;
                                }
                                updateAdFrequency({ variables: { frequency: adFrequency } });
                            }}
                            disabled={updating}
                        >
                            {updating ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)' }]}>
                    <Ionicons name="information-circle-outline" size={18} color="#6366F1" style={{ marginRight: 8 }} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Un valor de <Text style={{ fontWeight: 'bold', color: colors.text }}>5</Text> significa que el usuario verá un anuncio después de cada 5 publicaciones.
                    </Text>
                </View>
            </View>

            {/* ── Sección: Probabilidad ── */}
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                        <Ionicons name="pie-chart-outline" size={24} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mix de Origen</Text>
                        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Local vs Google AdMob</Text>
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <View style={{ marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', height: 10, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                            <View style={{ flex: adProbability, backgroundColor: '#F59E0B' }} />
                            <View style={{ flex: 100 - adProbability, backgroundColor: '#6366F1' }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '700' }}>{adProbability}% Local</Text>
                            <Text style={{ fontSize: 12, color: '#6366F1', fontWeight: '700' }}>{100 - adProbability}% AdMob</Text>
                        </View>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={[
                                styles.input,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, color: colors.text }
                            ]}
                            value={adProbability.toString()}
                            onChangeText={(val) => {
                                const num = parseInt(val || '0', 10);
                                if (!isNaN(num) && num >= 0 && num <= 100) setAdProbability(num);
                            }}
                            keyboardType="number-pad"
                            placeholder="Ej: 70"
                            placeholderTextColor={colors.textSecondary}
                        />
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: '#F59E0B', opacity: updatingProb ? 0.7 : 1 }]}
                            onPress={() => {
                                if (adProbability < 0 || adProbability > 100) {
                                    Toast.show({ type: 'error', text1: 'Error', text2: 'El valor debe estar entre 0 y 100' });
                                    return;
                                }
                                updateAdProbability({ 
                                    variables: { probability: adProbability }
                                }).then(() => {
                                    Toast.show({ type: 'success', text1: 'Probabilidad guardada' });
                                    refetchProb();
                                }).catch((err) => {
                                    Toast.show({ type: 'error', text1: 'Error al guardar', text2: err.message });
                                });
                            }}
                            disabled={updatingProb}
                        >
                            {updatingProb ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
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
    fieldGroup: { marginBottom: 16 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, fontSize: 16 },
    saveBtn: { paddingHorizontal: 20, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    infoBox: { flexDirection: 'row', padding: 12, borderRadius: 12, alignItems: 'flex-start' },
    infoText: { fontSize: 12, flex: 1, lineHeight: 16 }
});
