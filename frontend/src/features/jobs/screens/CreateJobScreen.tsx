import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Platform, KeyboardAvoidingView,
    ActivityIndicator, Image, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { Video as Compressor } from 'react-native-compressor';
import Toast from 'react-native-toast-message';
import { CREATE_JOB_OFFER, UPDATE_JOB_OFFER, UPSERT_PROFESSIONAL_PROFILE, GET_JOB_OFFERS, GET_PROFESSIONALS, GET_MY_JOB_OFFERS } from '../graphql/jobs.operations';
import { useLocalSearchParams } from 'expo-router';

const COUNTRY_CODES = [
    { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
    { code: '+51',  flag: '🇵🇪', name: 'Perú' },
    { code: '+52',  flag: '🇲🇽', name: 'México' },
    { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
    { code: '+56',  flag: '🇨🇱', name: 'Chile' },
    { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
    { code: '+1',   flag: '🇺🇸', name: 'EE.UU.' },
    { code: '+34',  flag: '🇪🇸', name: 'España' },
    { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
    { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
    { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
    { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
    { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
    { code: '+504', flag: '🇭🇳', name: 'Honduras' },
    { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
    { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
    { code: '+507', flag: '🇵🇦', name: 'Panamá' },
];


export default function CreateJobScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ editId?: string; editData?: string; initialTab?: string }>();
    const isEditing = !!params.editId;
    const editData = params.editData ? JSON.parse(params.editData as string) : null;

    // 'offer' → tab Oferta, 'service' → tab Servicio (internamente 'profile')
    const defaultTab: 'offer' | 'profile' = params.initialTab === 'service' ? 'profile' : 'offer';
    const [activeTab, setActiveTab] = useState<'offer' | 'profile'>(defaultTab);
    const [loading, setLoading] = useState(false);

    const [localMediaList, setLocalMediaList] = useState<{
        uri: string,
        type: string,
        mimeType: string,
        isValid: boolean,
        errorMessage?: string,
        uploadStatus?: 'idle' | 'compressing' | 'uploading' | 'done' | 'error',
        progress: number
    }[]>([]);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const { pickMultipleMedia, uploadMedia } = useMediaUpload();
    const extractPhoneParts = (fullPhone?: string) => {
        if (!fullPhone) return { code: '+593', number: '' };
        for (const country of COUNTRY_CODES) {
            if (fullPhone.startsWith(country.code)) {
                return { code: country.code, number: fullPhone.slice(country.code.length).trim() };
            }
        }
        return { code: '+593', number: fullPhone };
    };

    const initialPhoneParts = extractPhoneParts(editData?.contactPhone);

    // Form states - Offer
    const [offerTitle, setOfferTitle] = useState(editData?.title || '');
    const [offerDescription, setOfferDescription] = useState(editData?.description || '');
    const [offerLocation, setOfferLocation] = useState(editData?.location || '');
    const [offerSalary, setOfferSalary] = useState(editData?.salary || '');
    const [offerCountryCode, setOfferCountryCode] = useState(initialPhoneParts.code);
    const [offerPhone, setOfferPhone] = useState(initialPhoneParts.number);
    const [showOfferCountryPicker, setShowOfferCountryPicker] = useState(false);

    // Form states - Profile
    const [profProfession, setProfProfession] = useState(editData?.profession || '');
    const [profDescription, setProfDescription] = useState(editData?.description || '');
    const [profExperience, setProfExperience] = useState(editData?.experienceYears?.toString() || '');
    const [profCountryCode, setProfCountryCode] = useState(initialPhoneParts.code);
    const [profPhone, setProfPhone] = useState(initialPhoneParts.number);
    const [showProfCountryPicker, setShowProfCountryPicker] = useState(false);

    // Helper: renderiza el modal picker de país
    const renderCountryPicker = (
        visible: boolean,
        onClose: () => void,
        onSelect: (code: string) => void,
        current: string
    ) => (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={[pickerStyles.sheet, { backgroundColor: colors.surface }]}>
                    <Text style={[pickerStyles.pickerTitle, { color: colors.text }]}>Código de país</Text>
                    <FlatList
                        data={COUNTRY_CODES}
                        keyExtractor={i => i.code}
                        renderItem={({ item: c }) => (
                            <TouchableOpacity
                                style={[pickerStyles.countryRow, c.code === current && { backgroundColor: colors.primary + '22' }]}
                                onPress={() => { onSelect(c.code); onClose(); }}
                            >
                                <Text style={pickerStyles.countryFlag}>{c.flag}</Text>
                                <Text style={[pickerStyles.countryName, { color: colors.text }]}>{c.name}</Text>
                                <Text style={[pickerStyles.countryCode, { color: colors.textSecondary }]}>{c.code}</Text>
                                {c.code === current && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const [createJobOffer] = useMutation(CREATE_JOB_OFFER, {
        refetchQueries: [{ query: GET_JOB_OFFERS, variables: { limit: 20, offset: 0 } }],
        onCompleted: () => { setLoading(false); router.back(); },
        onError: (error) => { setLoading(false); Toast.show({ type: 'error', text1: 'Error al publicar', text2: error.message || 'No se pudo crear la oferta.' }); }
    });

    const [updateJobOffer] = useMutation(UPDATE_JOB_OFFER, {
        refetchQueries: [
            { query: GET_JOB_OFFERS, variables: { limit: 20, offset: 0 } },
            { query: GET_MY_JOB_OFFERS },
        ],
        onCompleted: () => { setLoading(false); router.back(); },
        onError: (error) => { setLoading(false); Toast.show({ type: 'error', text1: 'Error al guardar', text2: error.message || 'No se pudo actualizar la oferta.' }); }
    });

    const [upsertProfessionalProfile] = useMutation(UPSERT_PROFESSIONAL_PROFILE, {
        refetchQueries: [{ query: GET_PROFESSIONALS, variables: { limit: 20, offset: 0 } }],
        onCompleted: () => {
            setLoading(false);
            Toast.show({ type: 'success', text1: '¡Listo!', text2: 'Tu servicio ha sido guardado.' });
            router.back();
        },
        onError: (error) => {
            setLoading(false);
            Toast.show({ type: 'error', text1: 'Error al guardar', text2: error.message || 'No se pudo guardar el perfil.' });
        }
    });

    const handlePickMedia = async () => {
        const results = await pickMultipleMedia('All');
        if (results && results.length > 0) {
            const newMedia = results.map(res => {
                const type = res.mimeType.startsWith('video/') ? 'video' : 'image';
                let isValid = true;
                let errorMessage = '';

                if (type === 'video' && res.duration && res.duration > 60000) {
                    isValid = false;
                    errorMessage = 'Máx 1 minuto';
                }

                return {
                    uri: res.localUri,
                    type,
                    mimeType: res.mimeType,
                    isValid,
                    errorMessage,
                    uploadStatus: 'idle' as const,
                    progress: 0
                };
            });

            const updatedTotal = [...localMediaList, ...newMedia];

            let videoCount = 0;
            const validatedList = updatedTotal.map((item, index) => {
                if (item.type === 'video') {
                    videoCount++;
                    if (videoCount > 3) {
                        return { ...item, isValid: false, errorMessage: 'Límite de videos' };
                    }
                }
                if (index >= 10) {
                    return { ...item, isValid: false, errorMessage: 'Límite 10 archivos' };
                }
                return item;
            });

            setLocalMediaList(validatedList);
        }
    };

    const handleSave = async () => {
        if (loading || isUploadingMedia) return;

        // Validación inicial según el tipo de publicación
        if (activeTab === 'offer') {
            if (!offerTitle || !offerDescription || !offerLocation || !offerPhone) {
                Toast.show({
                    type: 'error',
                    text1: 'Campos obligatorios',
                    text2: 'Por favor completa título, descripción, ubicación y teléfono.',
                });
                return;
            }
        } else {
            if (!profProfession || !profDescription || !profPhone) {
                Toast.show({
                    type: 'error',
                    text1: 'Campos obligatorios',
                    text2: 'Por favor completa profesión, descripción y teléfono.',
                });
                return;
            }
        }

        const mediaToUpload = localMediaList.filter(m => m.isValid);
        let mediaInput: { url: string, type: string, order: number }[] = [];

        if (mediaToUpload.length > 0) {
            setIsUploadingMedia(true);
            try {
                const uploadPromises = mediaToUpload.map(async (media, index) => {
                    let finalUri = media.uri;

                    const startProgress = (status: any) => {
                        let currentProgress = 0;
                        const interval = setInterval(() => {
                            currentProgress += Math.random() * 15;
                            if (currentProgress >= 90) {
                                clearInterval(interval);
                                currentProgress = 90;
                            }
                            setLocalMediaList(prev => prev.map(m => m.uri === media.uri ? { ...m, uploadStatus: status, progress: Math.floor(currentProgress) } : m));
                        }, 200);
                        return interval;
                    };

                    if (media.type === 'video') {
                        const compInterval = startProgress('compressing');
                        try {
                            finalUri = await Compressor.compress(media.uri, {
                                compressionMethod: 'manual',
                                bitrate: 3000000,
                                maxSize: 720
                            });
                        } finally {
                            clearInterval(compInterval);
                        }
                    }

                    const uploadInterval = startProgress('uploading');
                    try {
                        let uploadFolder = activeTab === 'offer' ? 'job-offers' : 'professional-profiles';
                        const uploadedUrl = await uploadMedia(finalUri, media.mimeType, uploadFolder);
                        clearInterval(uploadInterval);
                        setLocalMediaList(prev => prev.map(m => m.uri === media.uri ? { ...m, uploadStatus: 'done' as const, progress: 100 } : m));
                        return {
                            url: uploadedUrl,
                            type: media.type === 'video' ? 'VIDEO' : 'IMAGE',
                            order: index
                        };
                    } catch (e) {
                        clearInterval(uploadInterval);
                        throw e;
                    }
                });
                
                mediaInput = await Promise.all(uploadPromises);
            } catch (error: any) {
                setIsUploadingMedia(false);
                Toast.show({ type: 'error', text1: 'Error en la subida', text2: error.message });
                return;
            }
        }

        setLoading(true);

        if (activeTab === 'offer') {
            if (isEditing) {
                updateJobOffer({
                    variables: {
                        input: {
                            id: params.editId,
                            title: offerTitle,
                            description: offerDescription,
                            location: offerLocation,
                            salary: offerSalary || undefined,
                            contactPhone: offerPhone,
                        }
                    }
                });
            } else {
                createJobOffer({
                    variables: {
                        input: {
                            title: offerTitle,
                            description: offerDescription,
                            location: offerLocation,
                            salary: offerSalary || undefined,
                            contactPhone: offerCountryCode + offerPhone,
                            media: mediaInput.length > 0 ? mediaInput : undefined,
                        }
                    }
                });
            }
        } else {
            upsertProfessionalProfile({
                variables: {
                    input: {
                        profession: profProfession,
                        description: profDescription,
                        experienceYears: profExperience ? parseInt(profExperience, 10) : undefined,
                        contactPhone: profCountryCode + profPhone,
                        media: mediaInput.length > 0 ? mediaInput : undefined,
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {isEditing 
                        ? (activeTab === 'offer' ? 'Editar Oferta' : 'Editar Servicio') 
                        : (activeTab === 'offer' ? 'Nueva Oferta' : 'Nuevo Servicio')}
                </Text>
                <TouchableOpacity 
                    onPress={handleSave} 
                    disabled={loading || isUploadingMedia}
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                    {loading || isUploadingMedia ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>{isEditing ? 'Guardar' : 'Publicar'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Segmented Control solo si no se está editando */}
                {!isEditing && (
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
                )}

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
                            <View style={{ flex: 0.75, marginRight: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Salario (Opcional)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Ej. $1500"
                                    placeholderTextColor={isDark ? '#555' : '#BBB'}
                                    value={offerSalary}
                                    onChangeText={setOfferSalary}
                                />
                            </View>
                            <View style={{ flex: 1.1, marginLeft: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono de contacto *</Text>
                                <View style={styles.phoneRow}>
                                    <TouchableOpacity
                                        style={[styles.countryCodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={() => setShowOfferCountryPicker(true)}
                                    >
                                        <Text style={[styles.countryCodeText, { color: colors.text }]}>{offerCountryCode}</Text>
                                        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.input, styles.phoneInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                        placeholder="0998765432"
                                        placeholderTextColor={isDark ? '#555' : '#BBB'}
                                        keyboardType="phone-pad"
                                        value={offerPhone}
                                        onChangeText={setOfferPhone}
                                    />
                                </View>
                            </View>
                        </View>
                        {renderCountryPicker(showOfferCountryPicker, () => setShowOfferCountryPicker(false), setOfferCountryCode, offerCountryCode)}

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Multimedia (Opcional)</Text>
                        <TouchableOpacity style={styles.mediaButton} activeOpacity={0.7} onPress={handlePickMedia}>
                            <View style={styles.mediaButtonIconGradientWrapper}>
                                <MaskedView style={{ width: 20, height: 20 }} maskElement={<Ionicons name="image" size={20} color="black" />}>
                                    <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                                </MaskedView>
                            </View>
                            <Text style={styles.mediaButtonText}>Añadir foto o video</Text>
                        </TouchableOpacity>

                        {localMediaList.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                {localMediaList.map((mediaItem, index) => (
                                    <View key={index} style={styles.mediaPreviewContainer}>
                                        {mediaItem.type === 'video' ? (
                                            <View style={styles.mediaPreview}>
                                                <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} />
                                                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                                                    <Ionicons name="play-circle" size={30} color="#FFF" />
                                                </View>
                                            </View>
                                        ) : (
                                            <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} resizeMode="cover" />
                                        )}

                                        {mediaItem.isValid && (!mediaItem.uploadStatus || mediaItem.uploadStatus === 'idle') && (
                                            <View style={styles.readyBadge}>
                                                <Ionicons name="checkmark-done-circle" size={20} color="#007AFF" />
                                            </View>
                                        )}

                                        {(!mediaItem.uploadStatus || mediaItem.uploadStatus === 'idle') && (
                                            <TouchableOpacity
                                                style={styles.removeMediaButton}
                                                onPress={() => setLocalMediaList(prev => prev.filter((_, i) => i !== index))}
                                            >
                                                <Ionicons name="close-circle" size={24} color="rgba(0,0,0,0.8)" />
                                            </TouchableOpacity>
                                        )}

                                        {!mediaItem.isValid && (
                                            <View style={styles.invalidOverlay}>
                                                <Ionicons name="close-outline" size={24} color="#FFF" />
                                                <Text style={styles.invalidText}>{mediaItem.errorMessage}</Text>
                                            </View>
                                        )}

                                        {mediaItem.uploadStatus && mediaItem.uploadStatus !== 'idle' && (
                                            <View style={[styles.uploadOverlay, mediaItem.uploadStatus === 'done' && styles.uploadDoneOverlay]}>
                                                {mediaItem.uploadStatus === 'done' ? (
                                                    <View style={styles.doneBadge}>
                                                        <Ionicons name="checkmark-circle" size={24} color="#4ADE80" />
                                                    </View>
                                                ) : (
                                                    <View style={styles.uploadingStatusContainer}>
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                        <View style={{ marginLeft: 4 }}>
                                                            <Text style={styles.uploadingLabel}>{mediaItem.uploadStatus === 'compressing' ? 'Optimizando...' : 'Subiendo...'}</Text>
                                                            <Text style={styles.progressText}>{mediaItem.progress}%</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        )}
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
                            <View style={{ flex: 0.75, marginRight: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>Años de exp. (Opc.)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Ej. 5"
                                    placeholderTextColor={isDark ? '#555' : '#BBB'}
                                    keyboardType="numeric"
                                    value={profExperience}
                                    onChangeText={setProfExperience}
                                />
                            </View>
                            <View style={{ flex: 1.1, marginLeft: 8 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono de contacto *</Text>
                                <View style={styles.phoneRow}>
                                    <TouchableOpacity
                                        style={[styles.countryCodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={() => setShowProfCountryPicker(true)}
                                    >
                                        <Text style={[styles.countryCodeText, { color: colors.text }]}>{profCountryCode}</Text>
                                        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.input, styles.phoneInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                        placeholder="0998765432"
                                        placeholderTextColor={isDark ? '#555' : '#BBB'}
                                        keyboardType="phone-pad"
                                        value={profPhone}
                                        onChangeText={setProfPhone}
                                    />
                                </View>
                            </View>
                        </View>
                        {renderCountryPicker(showProfCountryPicker, () => setShowProfCountryPicker(false), setProfCountryCode, profCountryCode)}
                        
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Multimedia (Opcional)</Text>
                        <TouchableOpacity style={styles.mediaButton} activeOpacity={0.7} onPress={handlePickMedia}>
                            <View style={styles.mediaButtonIconGradientWrapper}>
                                <MaskedView style={{ width: 20, height: 20 }} maskElement={<Ionicons name="image" size={20} color="black" />}>
                                    <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                                </MaskedView>
                            </View>
                            <Text style={styles.mediaButtonText}>Añadir foto o video</Text>
                        </TouchableOpacity>

                        {localMediaList.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                {localMediaList.map((mediaItem, index) => (
                                    <View key={index} style={styles.mediaPreviewContainer}>
                                        {mediaItem.type === 'video' ? (
                                            <View style={styles.mediaPreview}>
                                                <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} />
                                                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                                                    <Ionicons name="play-circle" size={30} color="#FFF" />
                                                </View>
                                            </View>
                                        ) : (
                                            <Image source={{ uri: mediaItem.uri }} style={styles.mediaPreview} resizeMode="cover" />
                                        )}

                                        {mediaItem.isValid && (!mediaItem.uploadStatus || mediaItem.uploadStatus === 'idle') && (
                                            <View style={styles.readyBadge}>
                                                <Ionicons name="checkmark-done-circle" size={20} color="#007AFF" />
                                            </View>
                                        )}

                                        {(!mediaItem.uploadStatus || mediaItem.uploadStatus === 'idle') && (
                                            <TouchableOpacity
                                                style={styles.removeMediaButton}
                                                onPress={() => setLocalMediaList(prev => prev.filter((_, i) => i !== index))}
                                            >
                                                <Ionicons name="close-circle" size={24} color="rgba(0,0,0,0.8)" />
                                            </TouchableOpacity>
                                        )}

                                        {!mediaItem.isValid && (
                                            <View style={styles.invalidOverlay}>
                                                <Ionicons name="close-outline" size={24} color="#FFF" />
                                                <Text style={styles.invalidText}>{mediaItem.errorMessage}</Text>
                                            </View>
                                        )}

                                        {mediaItem.uploadStatus && mediaItem.uploadStatus !== 'idle' && (
                                            <View style={[styles.uploadOverlay, mediaItem.uploadStatus === 'done' && styles.uploadDoneOverlay]}>
                                                {mediaItem.uploadStatus === 'done' ? (
                                                    <View style={styles.doneBadge}>
                                                        <Ionicons name="checkmark-circle" size={24} color="#4ADE80" />
                                                    </View>
                                                ) : (
                                                    <View style={styles.uploadingStatusContainer}>
                                                        <ActivityIndicator size="small" color="#FFF" />
                                                        <View style={{ marginLeft: 4 }}>
                                                            <Text style={styles.uploadingLabel}>{mediaItem.uploadStatus === 'compressing' ? 'Optimizando...' : 'Subiendo...'}</Text>
                                                            <Text style={styles.progressText}>{mediaItem.progress}%</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 16 }]}>
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
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        justifyContent: 'center',
    },
    mediaButtonIconGradientWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 101, 36, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    mediaButtonText: {
        color: '#FF6524',
        fontSize: 14,
        fontWeight: 'bold',
    },
    mediaPreviewContainer: {
        width: 100,
        height: 140,
        marginRight: 10,
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
    },
    mediaPreview: {
        width: '100%',
        height: '100%',
    },
    removeMediaButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: 20,
        borderRadius: 12,
        padding: 2,
    },
    readyBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 10,
        padding: 2,
        zIndex: 14,
    },
    invalidOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    invalidText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 12,
    },
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
    },
    uploadDoneOverlay: {
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    uploadingStatusContainer: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '90%',
    },
    uploadingLabel: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 9,
    },
    doneBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
    },
    progressText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: 0,
    },
    // ── Phone with country code ──
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    countryCodeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        height: 48,
    },
    countryCodeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    phoneInput: {
        flex: 1,
    },
});

const pickerStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 16,
        maxHeight: '70%',
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150,150,150,0.3)',
        marginBottom: 4,
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
    },
    countryFlag: {
        fontSize: 22,
    },
    countryName: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    countryCode: {
        fontSize: 14,
        fontWeight: '500',
    },
});
