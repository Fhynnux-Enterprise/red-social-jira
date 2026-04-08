import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Platform, KeyboardAvoidingView,
    ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { CREATE_JOB_OFFER, UPSERT_PROFESSIONAL_PROFILE, GET_JOB_OFFERS, GET_PROFESSIONALS } from '../graphql/jobs.operations';

export default function CreateJobScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'offer' | 'profile'>('offer');
    const [loading, setLoading] = useState(false);

    // Form states - Offer
    const [offerTitle, setOfferTitle] = useState('');
    const [offerDescription, setOfferDescription] = useState('');
    const [offerLocation, setOfferLocation] = useState('');
    const [offerSalary, setOfferSalary] = useState('');
    const [offerPhone, setOfferPhone] = useState('');

    // Form states - Profile
    const [profProfession, setProfProfession] = useState('');
    const [profDescription, setProfDescription] = useState('');
    const [profExperience, setProfExperience] = useState('');
    const [profPhone, setProfPhone] = useState('');

    const [createJobOffer] = useMutation(CREATE_JOB_OFFER, {
        refetchQueries: [{ query: GET_JOB_OFFERS, variables: { limit: 20, offset: 0 } }],
        onCompleted: () => {
            setLoading(false);
            router.back();
        },
        onError: (error) => {
            setLoading(false);
            Alert.alert('Error', error.message || 'No se pudo crear la oferta.');
        }
    });

    const [upsertProfessionalProfile] = useMutation(UPSERT_PROFESSIONAL_PROFILE, {
        refetchQueries: [{ query: GET_PROFESSIONALS, variables: { limit: 20, offset: 0 } }],
        onCompleted: () => {
            setLoading(false);
            router.back();
        },
        onError: (error) => {
            setLoading(false);
            Alert.alert('Error', error.message || 'No se pudo guardar el perfil.');
        }
    });

    const handleSave = async () => {
        if (loading) return;

        if (activeTab === 'offer') {
            if (!offerTitle || !offerDescription || !offerLocation || !offerPhone) {
                Alert.alert('Campos obligatorios', 'Por favor completa los campos marcados con *');
                return;
            }
            setLoading(true);
            createJobOffer({
                variables: {
                    input: {
                        title: offerTitle,
                        description: offerDescription,
                        location: offerLocation,
                        salary: offerSalary || undefined,
                        contactPhone: offerPhone,
                    }
                }
            });
        } else {
            if (!profProfession || !profDescription || !profPhone) {
                Alert.alert('Campos obligatorios', 'Por favor completa los campos marcados con *');
                return;
            }
            setLoading(true);
            upsertProfessionalProfile({
                variables: {
                    input: {
                        profession: profProfession,
                        description: profDescription,
                        experienceYears: profExperience ? parseInt(profExperience, 10) : undefined,
                        contactPhone: profPhone,
                    }
                }
            });
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Nueva Publicación</Text>
                <TouchableOpacity 
                    onPress={handleSave} 
                    disabled={loading}
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Publicar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Segmented Control */}
                <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.segmentBtn,
                            activeTab === 'offer' && { backgroundColor: '#FF6524', shadowColor: '#FF6524', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }
                        ]}
                        onPress={() => setActiveTab('offer')}
                    >
                        <Text style={[styles.segmentText, { color: activeTab === 'offer' ? '#FFF' : colors.textSecondary }]}>
                            Publicar Oferta
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.segmentBtn,
                            activeTab === 'profile' && { backgroundColor: '#FF6524', shadowColor: '#FF6524', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }
                        ]}
                        onPress={() => setActiveTab('profile')}
                    >
                        <Text style={[styles.segmentText, { color: activeTab === 'profile' ? '#FFF' : colors.textSecondary }]}>
                            Publicar Servicio
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'offer' ? (
                    <View style={styles.form}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Título de la vacante *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            placeholder="Ej. Desarrollador React Native"
                            placeholderTextColor={isDark ? '#555' : '#BBB'}
                            value={offerTitle}
                            onChangeText={setOfferTitle}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Descripción detallada *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            placeholder="Describe las tareas, requisitos y beneficios..."
                            placeholderTextColor={isDark ? '#555' : '#BBB'}
                            multiline
                            numberOfLines={4}
                            value={offerDescription}
                            onChangeText={setOfferDescription}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Ubicación *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            placeholder="Ej. Remoto, Ciudad, Sector..."
                            placeholderTextColor={isDark ? '#555' : '#BBB'}
                            value={offerLocation}
                            onChangeText={setOfferLocation}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Salario (Opcional)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Ej. $1500 - $2000"
                                    placeholderTextColor={isDark ? '#555' : '#BBB'}
                                    value={offerSalary}
                                    onChangeText={setOfferSalary}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono de contacto *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Ej. 0998765432"
                                    placeholderTextColor={isDark ? '#555' : '#BBB'}
                                    keyboardType="phone-pad"
                                    value={offerPhone}
                                    onChangeText={setOfferPhone}
                                />
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.form}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Profesión u Oficio *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            placeholder="Ej. Electricista, Abogado, Diseñador"
                            placeholderTextColor={isDark ? '#555' : '#BBB'}
                            value={profProfession}
                            onChangeText={setProfProfession}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Resumen de experiencia y servicios *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            placeholder="Cuentanos qué servicios ofreces y tu trayectoria..."
                            placeholderTextColor={isDark ? '#555' : '#BBB'}
                            multiline
                            numberOfLines={4}
                            value={profDescription}
                            onChangeText={setProfDescription}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Años de exp. (Opcional)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Ej. 5"
                                    placeholderTextColor={isDark ? '#555' : '#BBB'}
                                    keyboardType="numeric"
                                    value={profExperience}
                                    onChangeText={setProfExperience}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono de contacto *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Ej. 0998765432"
                                    placeholderTextColor={isDark ? '#555' : '#BBB'}
                                    keyboardType="phone-pad"
                                    value={profPhone}
                                    onChangeText={setProfPhone}
                                />
                            </View>
                        </View>
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            * Nota: Solo puedes tener un perfil profesional activo. Si ya tienes uno, se actualizará automáticamente.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    segmentedControl: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 3,
        marginBottom: 20,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        fontSize: 15,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },
    infoText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 8,
        lineHeight: 18,
    }
});
