import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator,
    Image, Modal, FlatList, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useMutation, useApolloClient } from '@apollo/client/react';
import Toast from 'react-native-toast-message';
import { Video as Compressor } from 'react-native-compressor';
import { useTheme } from '../../../theme/ThemeContext';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import { CREATE_LOCAL_AD, UPDATE_LOCAL_AD, GET_MY_ADS } from '../graphql/advertisers.operations';
import { LocalAd } from '../screens/AdvertiserDashboardScreen';

// ─── Datos ────────────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    visible: boolean;
    onClose: () => void;
    onSuccess: (updatedAd?: any) => void;
    ad?: LocalAd | null;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    mimeType: string;
    isValid: boolean;
    errorMessage?: string;
    uploadStatus?: 'idle' | 'compressing' | 'uploading' | 'done' | 'error';
    progress: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CreateLocalAdModal({ visible, onClose, onSuccess, ad }: Props) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { pickMultipleMedia, uploadMedia } = useMediaUpload();
    const apolloClient = useApolloClient();

    const isEditing = !!ad;

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [actionUrl, setActionUrl] = useState('');
    const [actionLabel, setActionLabel] = useState('Ver más');
    const [countryCode, setCountryCode] = useState('+593');
    const [phone, setPhone] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    React.useEffect(() => {
        if (ad) {
            setTitle(ad.title);
            setDescription(ad.description);
            setActionUrl(ad.actionUrl || '');
            setActionLabel(ad.actionLabel || 'Ver más');
            
            // Parse phone: find matching country code
            const matchedCode = COUNTRY_CODES.find(c => ad.whatsappPhone?.startsWith(c.code));
            if (matchedCode) {
                setCountryCode(matchedCode.code);
                setPhone(ad.whatsappPhone!.replace(matchedCode.code, ''));
            } else {
                setPhone(ad.whatsappPhone || '');
            }

            // Media
            if (ad.media) {
                setMediaList(ad.media.map(m => ({
                    uri: m.url,
                    type: m.type.toLowerCase() as any,
                    mimeType: m.type === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
                    isValid: true,
                    uploadStatus: 'done',
                    progress: 100
                })));
            }
        } else {
            reset();
        }
    }, [ad]);

    const [createLocalAd] = useMutation(CREATE_LOCAL_AD, {
        refetchQueries: [{ query: GET_MY_ADS }],
        onCompleted: () => {
            setLoading(false);
            reset();
            Toast.show({ type: 'success', text1: '¡Anuncio creado!', text2: 'Ya aparece en tu panel de anuncios.' });
            onSuccess();
        },
        onError: (err) => {
            setLoading(false);
            setErrorMsg(err.message);
        },
    });

    const [updateLocalAd] = useMutation(UPDATE_LOCAL_AD, {
        refetchQueries: [{ query: GET_MY_ADS }],
        update(cache, { data }) {
            const updated = data?.updateLocalAd;
            if (!updated?.id) return;
            cache.modify({
                id: cache.identify({ __typename: 'LocalAd', id: updated.id }),
                fields: {
                    title: () => updated.title,
                    description: () => updated.description,
                    actionUrl: () => updated.actionUrl,
                    actionLabel: () => updated.actionLabel,
                    whatsappPhone: () => updated.whatsappPhone,
                },
            });
        },
        onCompleted: (data) => {
            setLoading(false);
            Toast.show({ type: 'success', text1: '\u00a1Anuncio actualizado!', text2: 'Los cambios se han guardado.' });
            // Pasar el anuncio actualizado para que FeedScreen actualice su cache local
            onSuccess(data?.updateLocalAd);
        },
        onError: (err) => {
            setLoading(false);
            setErrorMsg(err.message);
        },
    });

    const reset = () => {
        setTitle(''); setDescription(''); setActionUrl('');
        setActionLabel('Ver más'); setPhone(''); setMediaList([]);
        setCountryCode('+593'); setErrorMsg(null);
    };

    const handleClose = () => { reset(); onClose(); };

    // ─── Media picker ────────────────────────────────────────────────────────

    const handlePickMedia = async () => {
        const results = await pickMultipleMedia('All');
        if (!results?.length) return;

        const newMedia: MediaItem[] = results.map((res) => {
            const type = res.mimeType.startsWith('video/') ? 'video' : 'image';
            const isValid = type !== 'video' || !res.duration || res.duration <= 60000;
            return {
                uri: res.localUri, type, mimeType: res.mimeType,
                isValid, errorMessage: !isValid ? 'Máx 1 minuto' : '',
                uploadStatus: 'idle', progress: 0,
            };
        });

        const combined = [...mediaList, ...newMedia].map((item, idx) => ({
            ...item,
            isValid: item.isValid && idx < 5,
            errorMessage: idx >= 5 ? 'Máx 5 archivos' : item.errorMessage,
        }));
        setMediaList(combined);
    };

    // ─── Submit ──────────────────────────────────────────────────────────────

    const handlePublish = async () => {
        setErrorMsg(null);
        if (!title.trim() || !description.trim()) {
            setErrorMsg('El título y la descripción son requeridos.');
            return;
        }
        if (!phone.trim() && !actionUrl.trim()) {
            setErrorMsg('Debes incluir al menos un teléfono de WhatsApp o un enlace externo.');
            return;
        }

        let mediaInput: { url: string; type: string }[] = [];

        // Filtrar qué archivos necesitan subirse realmente
        const mediaToUpload = mediaList.filter((m) => m.isValid && m.uploadStatus !== 'done');
        const alreadyUploaded = mediaList.filter((m) => m.isValid && m.uploadStatus === 'done');

        if (mediaToUpload.length > 0) {
            setIsUploadingMedia(true);
            try {
                const uploaded = await Promise.all(
                    mediaToUpload.map(async (media) => {
                        let finalUri = media.uri;
                        let finalMime = media.mimeType;

                        const setStatus = (status: MediaItem['uploadStatus'], prog: number) => {
                            setMediaList((prev) =>
                                prev.map((m) => m.uri === media.uri ? { ...m, uploadStatus: status, progress: prog } : m)
                            );
                        };

                        if (media.type === 'video') {
                            setStatus('compressing', 30);
                            try {
                                finalUri = await Compressor.compress(media.uri, { compressionMethod: 'manual', bitrate: 3000000, maxSize: 720 });
                                finalMime = 'video/mp4';
                            } catch { /* usar original */ }
                        }

                        setStatus('uploading', 60);
                        const url = await uploadMedia(finalUri, finalMime, 'local-ads');
                        setStatus('done', 100);
                        return { url, type: media.type === 'video' ? 'VIDEO' : 'IMAGE' };
                    })
                );
                mediaInput = [
                    ...alreadyUploaded.map(m => ({ url: m.uri, type: m.type === 'video' ? 'VIDEO' : 'IMAGE' })),
                    ...uploaded
                ];
            } catch (err: any) {
                setIsUploadingMedia(false);
                setErrorMsg('Error al subir archivos: ' + err.message);
                return;
            }
            setIsUploadingMedia(false);
        } else {
            // Todos ya estaban subidos
            mediaInput = alreadyUploaded.map(m => ({ url: m.uri, type: m.type === 'video' ? 'VIDEO' : 'IMAGE' }));
        }

        setLoading(true);
        if (isEditing) {
            updateLocalAd({
                variables: {
                    input: {
                        id: ad!.id,
                        title: title.trim(),
                        description: description.trim(),
                        actionUrl: actionUrl.trim() || null,
                        actionLabel: actionLabel.trim() || 'Ver más',
                        whatsappPhone: phone.trim() ? countryCode + phone.trim() : null,
                        media: mediaInput.length > 0 ? mediaInput : undefined,
                    },
                },
            });
        } else {
            createLocalAd({
                variables: {
                    input: {
                        title: title.trim(),
                        description: description.trim(),
                        actionUrl: actionUrl.trim() || null,
                        actionLabel: actionLabel.trim() || 'Ver más',
                        whatsappPhone: phone.trim() ? countryCode + phone.trim() : null,
                        media: mediaInput.length > 0 ? mediaInput : undefined,
                    },
                },
            });
        }
    };

    // ─── Country Picker ──────────────────────────────────────────────────────

    const renderCountryPicker = () => (
        <Modal visible={showCountryPicker} transparent animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
            <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={() => setShowCountryPicker(false)}>
                <View style={[pickerStyles.sheet, { backgroundColor: colors.surface }]}>
                    <Text style={[pickerStyles.title, { color: colors.text }]}>Código de país</Text>
                    <FlatList
                        data={COUNTRY_CODES}
                        keyExtractor={(i) => i.code}
                        renderItem={({ item: c }) => (
                            <TouchableOpacity
                                style={[pickerStyles.row, c.code === countryCode && { backgroundColor: colors.primary + '22' }]}
                                onPress={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                            >
                                <Text style={pickerStyles.flag}>{c.flag}</Text>
                                <Text style={[pickerStyles.name, { color: colors.text }]}>{c.name}</Text>
                                <Text style={[pickerStyles.code, { color: colors.textSecondary }]}>{c.code}</Text>
                                {c.code === countryCode && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const inputStyle = [styles.input, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface,
        borderColor: colors.border,
        color: colors.text,
    }];

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditing ? 'Editar Anuncio' : 'Nuevo Anuncio'}</Text>
                    <TouchableOpacity
                        style={[styles.publishBtn, { backgroundColor: colors.primary, opacity: (loading || isUploadingMedia) ? 0.7 : 1 }]}
                        onPress={handlePublish}
                        disabled={loading || isUploadingMedia}
                    >
                        {loading || isUploadingMedia
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <Text style={styles.publishBtnText}>Publicar</Text>
                        }
                    </TouchableOpacity>
                </View>

                {/* App-Styled Custom Alert */}
                {errorMsg && (
                    <View style={StyleSheet.absoluteFill}>
                        <View style={styles.alertOverlay}>
                            <View style={[styles.alertCard, { backgroundColor: colors.background }]}>
                                <View style={[styles.alertIconWrapper, { backgroundColor: '#EF444420' }]}>
                                    <Ionicons name="alert-circle" size={32} color="#EF4444" />
                                </View>
                                <Text style={[styles.alertTitle, { color: colors.text }]}>¡Atención!</Text>
                                <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{errorMsg}</Text>
                                <TouchableOpacity 
                                    style={[styles.alertBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => setErrorMsg(null)}
                                >
                                    <Text style={styles.alertBtnText}>Entendido</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                    {/* Título */}
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Título del anuncio *</Text>
                    <TextInput
                        style={inputStyle} value={title} onChangeText={setTitle}
                        placeholder="Ej: 20% de descuento en nuestro restaurante"
                        placeholderTextColor={isDark ? '#555' : '#BBB'} maxLength={100}
                    />
                    <Text style={[styles.counter, { color: colors.textSecondary }]}>{title.length}/100</Text>

                    {/* Descripción */}
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Descripción *</Text>
                    <TextInput
                        style={[inputStyle, styles.textArea]} value={description} onChangeText={setDescription}
                        placeholder="Describe tu oferta, producto o servicio con todos los detalles..."
                        placeholderTextColor={isDark ? '#555' : '#BBB'} multiline numberOfLines={4} maxLength={500}
                    />
                    <Text style={[styles.counter, { color: colors.textSecondary }]}>{description.length}/500</Text>

                    {/* WhatsApp + Link */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>WhatsApp (opcional si hay enlace)</Text>
                            <View style={styles.phoneRow}>
                                <TouchableOpacity
                                    style={[styles.countryBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}
                                    onPress={() => setShowCountryPicker(true)}
                                >
                                    <Text style={[styles.countryCode, { color: colors.text }]}>{countryCode}</Text>
                                    <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <TextInput
                                    style={[inputStyle, styles.phoneInput]} value={phone} onChangeText={setPhone}
                                    placeholder="0987654321" placeholderTextColor={isDark ? '#555' : '#BBB'}
                                    keyboardType="phone-pad" maxLength={15}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Enlace opcional */}
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Enlace externo (opcional)</Text>
                    <TextInput
                        style={inputStyle} value={actionUrl} onChangeText={setActionUrl}
                        placeholder="https://tu-sitio-web.com" placeholderTextColor={isDark ? '#555' : '#BBB'}
                        autoCapitalize="none" keyboardType="url"
                    />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Texto del botón de enlace</Text>
                    <TextInput
                        style={inputStyle} value={actionLabel} onChangeText={setActionLabel}
                        placeholder="Ver más" placeholderTextColor={isDark ? '#555' : '#BBB'} maxLength={50}
                    />

                    {/* Multimedia (Sólo creación) */}
                    {!isEditing && (
                        <>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Multimedia (opcional, máx. 5)</Text>
                            <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.7} onPress={handlePickMedia}>
                                <View style={styles.mediaBtnIconWrapper}>
                                    <MaskedView style={{ width: 20, height: 20 }} maskElement={<Ionicons name="image" size={20} color="black" />}>
                                        <LinearGradient colors={[colors.primary, colors.secondary ?? colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                                    </MaskedView>
                                </View>
                                <Text style={[styles.mediaBtnText, { color: colors.text }]}>Añadir foto o video</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Previews (Read-only if editing) */}
                    {isEditing && mediaList.length > 0 && (
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Multimedia (No editable)</Text>
                    )}

                    {/* Previews */}
                    {mediaList.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                            {mediaList.map((item, index) => (
                                <View key={index} style={styles.previewWrapper}>
                                    <Image source={{ uri: item.uri }} style={styles.preview} resizeMode="cover" />
                                    {item.type === 'video' && (
                                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="play-circle" size={28} color="#FFF" />
                                        </View>
                                    )}
                                    {(!item.uploadStatus || item.uploadStatus === 'idle') && !isEditing && (
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => setMediaList((prev) => prev.filter((_, i) => i !== index))}
                                        >
                                            <Ionicons name="close-circle" size={22} color="rgba(0,0,0,0.8)" />
                                        </TouchableOpacity>
                                    )}
                                    {item.uploadStatus && item.uploadStatus !== 'idle' && (
                                        <View style={[styles.uploadOverlay, item.uploadStatus === 'done' && styles.doneOverlay]}>
                                            {item.uploadStatus === 'done'
                                                ? <Ionicons name="checkmark-circle" size={24} color="#4ADE80" />
                                                : <>
                                                    <ActivityIndicator size="small" color="#FFF" />
                                                    <Text style={styles.uploadText}>
                                                        {item.uploadStatus === 'compressing' ? 'Optimizando' : `${item.progress}%`}
                                                    </Text>
                                                </>
                                            }
                                        </View>
                                    )}
                                    {!item.isValid && (
                                        <View style={styles.invalidOverlay}>
                                            <Ionicons name="close-outline" size={20} color="#FFF" />
                                            <Text style={styles.invalidText}>{item.errorMessage}</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* Info tip */}
                    <View style={[styles.tip, { backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }]}>
                        <Ionicons name="information-circle-outline" size={18} color="#6366F1" style={{ marginRight: 8, flexShrink: 0 }} />
                        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                            Tu anuncio aparecerá en el feed de la comunidad. El botón de WhatsApp abre una conversación directa con tu número.
                        </Text>
                    </View>
                </ScrollView>

                {renderCountryPicker()}
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
    closeBtn: { padding: 4 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
    publishBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12 },
    publishBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    content: { padding: 20 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 18 },
    counter: { fontSize: 11, textAlign: 'right', marginTop: 4 },
    input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
    textArea: { height: 110, textAlignVertical: 'top', paddingTop: 14 },
    row: { flexDirection: 'row', marginTop: 0 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 50, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
    countryCode: { fontSize: 14, fontWeight: '700' },
    phoneInput: { flex: 1, marginTop: 0 },
    mediaBtn: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#6366F150', borderRadius: 12, paddingHorizontal: 16, gap: 12 },
    mediaBtnIconWrapper: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    mediaBtnText: { fontSize: 15, fontWeight: '600' },
    previewWrapper: { width: 88, height: 88, marginRight: 8, borderRadius: 12, overflow: 'hidden' },
    preview: { width: 88, height: 88 },
    removeBtn: { position: 'absolute', top: 4, right: 4 },
    uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 4 },
    doneOverlay: { backgroundColor: 'rgba(0,0,0,0.2)' },
    uploadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    invalidOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(239,68,68,0.75)', justifyContent: 'center', alignItems: 'center', gap: 2 },
    invalidText: { color: '#FFF', fontSize: 10, fontWeight: '700', textAlign: 'center' },
    tip: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 24, padding: 14, borderRadius: 12, borderWidth: 1 },
    errorFloatingContainer: { position: 'absolute', top: 120, left: 20, right: 20, zIndex: 999 },
    alertOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30, zIndex: 1000 },
    alertCard: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.34, shadowRadius: 6.27 },
    alertIconWrapper: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    alertTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    alertMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    alertBtn: { width: '100%', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

const pickerStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: 420 },
    title: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, gap: 12 },
    flag: { fontSize: 22 },
    name: { fontSize: 15, flex: 1 },
    code: { fontSize: 14 },
});
