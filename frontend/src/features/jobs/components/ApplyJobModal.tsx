import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView, Alert, Dimensions, Image, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { APPLY_TO_JOB, GET_MY_APPLICATIONS, UPDATE_APPLICATION } from '../graphql/jobs.operations';
import ImageCarousel from '../../feed/components/ImageCarousel';

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

interface ApplyJobModalProps {
    visible: boolean;
    onClose: () => void;
    jobOffer: {
        id: string;
        title: string;
        author?: { firstName: string; lastName: string };
        media?: { url: string; type: string; order: number }[];
    } | null;
    applicationToEdit?: any;
}

type UploadStep = 'idle' | 'submitting' | 'uploading_cv' | 'done' | 'error';

export default function ApplyJobModal({ visible, onClose, jobOffer, applicationToEdit }: ApplyJobModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [message, setMessage] = useState('');
    const [cvFile, setCvFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [step, setStep] = useState<UploadStep>('idle');
    const [stepLabel, setStepLabel] = useState('');
    
    const [countryCode, setCountryCode] = useState('+593');
    const [phone, setPhone] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    
    const [modalWidth, setModalWidth] = useState(Dimensions.get('window').width);

    // Limpiar estado al abrir el modal o si cambia la aplicación a editar
    useEffect(() => {
        if (visible) {
            if (applicationToEdit) {
                setMessage(applicationToEdit.message || '');
                if (applicationToEdit.contactPhone) {
                    const matchedCode = COUNTRY_CODES.find(c => applicationToEdit.contactPhone.startsWith(c.code));
                    if (matchedCode) {
                        setCountryCode(matchedCode.code);
                        setPhone(applicationToEdit.contactPhone.slice(matchedCode.code.length));
                    } else {
                        setPhone(applicationToEdit.contactPhone);
                    }
                } else {
                    setCountryCode('+593');
                    setPhone('');
                }
                setCvFile(null);
            } else {
                setMessage('');
                setCvFile(null);
                setCountryCode('+593');
                setPhone('');
            }
            setStep('idle');
            setStepLabel('');
            setShowCountryPicker(false);
        }
    }, [visible, applicationToEdit]);

    const [applyToJob] = useMutation<{
        applyToJob: {
            application: { id: string; status: string };
            cvUploadUrl: string;
            cvPublicUrl: string;
        };
    }>(APPLY_TO_JOB, {
        refetchQueries: [{ query: GET_MY_APPLICATIONS }],
    });

    const [updateApplicationMutation] = useMutation(UPDATE_APPLICATION, {
        refetchQueries: [{ query: GET_MY_APPLICATIONS }],
    });

    // ── Seleccionar PDF ──────────────────────────────────────────────────────
    const handlePickCV = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets.length > 0) {
                setCvFile(result.assets[0]);
            }
        } catch (e: any) {
            Alert.alert('Error', 'No se pudo seleccionar el archivo.');
        }
    };

    // ── Confirmar postulación ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!jobOffer) return;

        if (!applicationToEdit && !cvFile) {
            Alert.alert('Hoja de vida requerida', 'Por favor adjunta tu hoja de vida en PDF.');
            return;
        }

        try {
            setStep('submitting');
            setStepLabel(applicationToEdit ? 'Actualizando postulación...' : 'Registrando postulación...');

            let cvUploadUrlToUse = '';

            if (applicationToEdit) {
                const { data } = await updateApplicationMutation({
                    variables: {
                        input: {
                            applicationId: applicationToEdit.id,
                            message: message.trim() || undefined,
                            contactPhone: phone.trim() ? countryCode + phone.trim() : undefined,
                            requestNewCv: false, // Por requerimiento no mandamos cv en edicion
                        },
                    },
                });
                if (!data) throw new Error('No se recibió respuesta del servidor.');
            } else {
                const { data } = await applyToJob({
                    variables: {
                        input: {
                            jobOfferId: jobOffer.id,
                            message: message.trim() || undefined,
                            contactPhone: phone.trim() ? countryCode + phone.trim() : undefined,
                        },
                    },
                });

                if (!data) throw new Error('No se recibió respuesta del servidor.');
                cvUploadUrlToUse = data.applyToJob.cvUploadUrl;
            }

            // 2. Subir PDF directamente a R2 si hay un archivo seleccionado y estamos creando
            if (cvFile && cvUploadUrlToUse && !applicationToEdit) {
                setStep('uploading_cv');
                setStepLabel('Subiendo hoja de vida...');

                const response = await fetch(cvFile.uri);
                const blob = await response.blob();

                const uploadResponse = await fetch(cvUploadUrlToUse, {
                    method: 'PUT',
                    body: blob,
                    headers: { 'Content-Type': 'application/pdf' },
                });

                if (!uploadResponse.ok) {
                    throw new Error(`Error al subir el CV: ${uploadResponse.status}`);
                }
            }

            setStep('done');
            setStepLabel(applicationToEdit ? '¡Postulación guardada!' : '¡Postulación enviada!');

            // Pequeña pausa para mostrar el estado de éxito antes de cerrar
            setTimeout(() => {
                onClose();
            }, 1200);

        } catch (e: any) {
            setStep('error');
            const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Ocurrió un error inesperado.';
            Alert.alert('Error al postularse', msg);
            setStep('idle');
        }
    };

    const isLoading = step === 'submitting' || step === 'uploading_cv';
    const canSubmit = !isLoading && step !== 'done';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={isLoading ? undefined : onClose}
        >
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* ── Header ── */}
                <View style={[
                    styles.header,
                    { paddingTop: insets.top + 10, borderBottomColor: colors.border }
                ]}>
                    <TouchableOpacity
                        onPress={onClose}
                        disabled={isLoading}
                        style={styles.closeBtn}
                    >
                        <Ionicons name="close" size={24} color={isLoading ? colors.textSecondary : colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{applicationToEdit ? 'Editar Postulación' : 'Postularse'}</Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        style={[
                            styles.sendBtn,
                            { backgroundColor: canSubmit ? '#FF6524' : colors.border }
                        ]}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : step === 'done' ? (
                            <Ionicons name="checkmark" size={18} color="#FFF" />
                        ) : (
                            <Text style={styles.sendBtnText}>Enviar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    onLayout={(e) => setModalWidth(e.nativeEvent.layout.width - 40)} // parent has padding 20
                >
                    {/* ── Carrusel Multimedia ── */}
                    {jobOffer?.media && jobOffer.media.length > 0 && (
                        <View style={[styles.carouselContainer, { width: modalWidth }]}>
                            <ImageCarousel
                                media={jobOffer.media}
                                containerWidth={modalWidth}
                                customAspectRatio={modalWidth / 180}
                                disableFullscreen={true}
                            />
                        </View>
                    )}

                    {/* ── Info de la oferta ── */}
                    {jobOffer && (
                        <View style={[styles.offerBanner, { backgroundColor: isDark ? 'rgba(255,101,36,0.1)' : 'rgba(255,101,36,0.07)', borderColor: 'rgba(255,101,36,0.25)' }]}>
                            <Ionicons name="briefcase" size={18} color="#FF6524" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.offerTitle, { color: colors.text }]} numberOfLines={1}>
                                    {jobOffer.title}
                                </Text>
                                {jobOffer.author && (
                                    <Text style={[styles.offerAuthor, { color: colors.textSecondary }]}>
                                        {jobOffer.author.firstName} {jobOffer.author.lastName}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* ── Mensaje de presentación ── */}
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        Carta de presentación <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(opcional)</Text>
                    </Text>
                    <TextInput
                        style={[
                            styles.textArea,
                            {
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderColor: colors.border,
                            }
                        ]}
                        placeholder="Cuéntale al empleador por qué eres el candidato ideal..."
                        placeholderTextColor={isDark ? '#555' : '#BBB'}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        value={message}
                        onChangeText={setMessage}
                        editable={!isLoading}
                        maxLength={600}
                    />
                    <Text style={[styles.counter, { color: colors.textSecondary }]}>
                        {message.length}/600
                    </Text>

                    {/* ── Teléfono de Contacto ── */}
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>Teléfono de contacto <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(opcional)</Text></Text>
                    <View style={styles.phoneRow}>
                        <TouchableOpacity
                            style={[styles.countryCodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => setShowCountryPicker(true)}
                        >
                            <Text style={[styles.countryCodeText, { color: colors.text }]}>{countryCode}</Text>
                            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.phoneInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            placeholder="0998765432"
                            placeholderTextColor={isDark ? '#555' : '#BBB'}
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            editable={!isLoading}
                        />
                    </View>

                    {/* ── Adjuntar CV ── */}
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>
                        Hoja de vida (PDF) <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(opcional)</Text>
                    </Text>

                    {applicationToEdit ? (
                        <View style={[styles.cvPreview, { backgroundColor: colors.surface, borderColor: colors.border, padding: 16 }]}>
                            <View style={styles.cvPreviewLeft}>
                                <View style={[styles.pdfBadge, { backgroundColor: 'rgba(255,101,36,0.12)' }]}>
                                    <Ionicons name="document-text" size={22} color="#FF6524" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.cvFileName, { color: colors.text, fontSize: 13 }]} numberOfLines={1}>
                                        No puedes editar el archivo enviado
                                    </Text>
                                    <Text style={[styles.cvFileSize, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                                        Mantendremos el PDF de tu postulación original.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : cvFile ? (
                        /* Vista previa del archivo seleccionado */
                        <View style={[styles.cvPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.cvPreviewLeft}>
                                <View style={[styles.pdfBadge, { backgroundColor: 'rgba(255,101,36,0.12)' }]}>
                                    <Ionicons name="document-text" size={22} color="#FF6524" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.cvFileName, { color: colors.text }]} numberOfLines={1}>
                                        {cvFile.name}
                                    </Text>
                                    <Text style={[styles.cvFileSize, { color: colors.textSecondary }]}>
                                        {cvFile.size ? `${(cvFile.size / 1024).toFixed(0)} KB` : 'PDF'}
                                    </Text>
                                </View>
                            </View>
                            {!isLoading && (
                                <TouchableOpacity onPress={() => setCvFile(null)} style={styles.cvRemoveBtn}>
                                    <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        /* Botón para seleccionar archivo */
                        <TouchableOpacity
                            style={[
                                styles.cvPickerBtn,
                                { backgroundColor: colors.surface, borderColor: colors.border }
                            ]}
                            onPress={handlePickCV}
                            disabled={isLoading}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.cvPickerIcon, { backgroundColor: 'rgba(255,101,36,0.1)' }]}>
                                <Ionicons name="cloud-upload-outline" size={24} color="#FF6524" />
                            </View>
                            <Text style={[styles.cvPickerText, { color: colors.text }]}>
                                Adjuntar Hoja de Vida
                            </Text>
                            <Text style={[styles.cvPickerSub, { color: colors.textSecondary }]}>
                                Solo archivos PDF
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* ── Estado del proceso de subida ── */}
                    {isLoading && (
                        <View style={[styles.progressBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                            <ActivityIndicator size="small" color="#FF6524" />
                            <Text style={[styles.progressLabel, { color: colors.text }]}>
                                {stepLabel}
                            </Text>
                        </View>
                    )}

                    {step === 'done' && (
                        <View style={[styles.progressBanner, { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)' }]}>
                            <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />
                            <Text style={[styles.progressLabel, { color: '#4ADE80' }]}>
                                {applicationToEdit ? '¡Postulación editada con éxito!' : '¡Postulación enviada con éxito!'}
                            </Text>
                        </View>
                    )}

                    {/* ── Aviso de privacidad ── */}
                    <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
                        Al postularte, el empleador podrá ver tu nombre, foto de perfil y la carta de presentación que escribiste.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Country Picker Modal */}
            <Modal visible={showCountryPicker} transparent animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
                <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowCountryPicker(false)}>
                    <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.pickerTitle, { color: colors.text }]}>Código de país</Text>
                        <FlatList
                            data={COUNTRY_CODES}
                            keyExtractor={i => i.code}
                            renderItem={({ item: c }) => (
                                <TouchableOpacity
                                    style={[styles.countryRow, c.code === countryCode && { backgroundColor: colors.primary + '22' }]}
                                    onPress={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                                >
                                    <Text style={styles.flag}>{c.flag}</Text>
                                    <Text style={[styles.countryName, { color: colors.text }]}>{c.name}</Text>
                                    <Text style={[styles.code, { color: colors.textSecondary }]}>{c.code}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

        </Modal>
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
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
        width: 36,
    },
    sendBtn: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    content: {
        padding: 20,
    },
    carouselContainer: {
        height: 180,
        backgroundColor: '#000',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
    },
    offerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        marginBottom: 24,
    },
    offerTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    offerAuthor: {
        fontSize: 12,
        marginTop: 2,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
    },
    textArea: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 15,
        minHeight: 130,
        lineHeight: 22,
    },
    counter: {
        fontSize: 11,
        textAlign: 'right',
        marginTop: 6,
    },
    cvPickerBtn: {
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        padding: 20,
        alignItems: 'center',
        gap: 8,
    },
    cvPickerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    cvPickerText: {
        fontSize: 15,
        fontWeight: '600',
    },
    cvPickerSub: {
        fontSize: 12,
    },
    cvPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
    },
    cvPreviewLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pdfBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cvFileName: {
        fontSize: 14,
        fontWeight: '600',
    },
    cvFileSize: {
        fontSize: 12,
        marginTop: 2,
    },
    cvRemoveBtn: {
        padding: 4,
        marginLeft: 8,
    },
    progressBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        marginTop: 16,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    disclaimer: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        marginTop: 24,
        paddingHorizontal: 8,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    countryCodeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 8,
    },
    countryCodeText: {
        fontSize: 15,
        marginRight: 4,
    },
    phoneInput: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '70%',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    countryName: {
        flex: 1,
        fontSize: 16,
    },
    code: {
        fontSize: 16,
        fontWeight: '600',
    },
});
