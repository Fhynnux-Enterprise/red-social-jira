import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Switch,
    Platform,
    Keyboard,
    Image,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { SEND_GLOBAL_NOTIFICATION, GET_CITIES } from '../graphql/moderation.operations';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { useMediaUpload } from '../../storage/hooks/useMediaUpload';
import ConfirmModal from '../../../components/ConfirmModal';

export default function AdminGlobalNotifications() {
    const { colors, isDark } = useTheme();
    const { pickImage, uploadMedia } = useMediaUpload();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [localImage, setLocalImage] = useState<{ uri: string; mimeType: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cityId, setCityId] = useState<string>('all');
    const [saveInDb, setSaveInDb] = useState(true);
    const [detailed, setDetailed] = useState(false);
    const [badgeText, setBadgeText] = useState('OFICIAL');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);

    const { data: citiesData } = useQuery(GET_CITIES);
    const cities = citiesData?.getCities || [
        { id: 'chunchi', name: 'Chunchi' },
        { id: 'alausi', name: 'Alausí' }
    ];

    const bodyInputRef = React.useRef<any>(null);
    const imageUrlInputRef = React.useRef<any>(null);
    const badgeTextInputRef = React.useRef<any>(null);

    const [sendGlobalNotification, { loading }] = useMutation(SEND_GLOBAL_NOTIFICATION, {
        onCompleted: (data) => {
            if (data?.sendGlobalNotification) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({
                    type: 'success',
                    text1: 'Éxito',
                    text2: 'La notificación global se envió correctamente.',
                });
                // Reset form
                setTitle('');
                setBody('');
                setImageUrl('');
                setLocalImage(null);
                setCityId('all');
                setSaveInDb(true);
                setDetailed(false);
                setBadgeText('OFICIAL');
                Keyboard.dismiss();
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo enviar la notificación.',
                });
            }
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('[AdminGlobalNotifications] Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error en el servidor',
                text2: error.message || 'Ocurrió un error inesperado.',
            });
        }
    });

    const isProcessing = loading || isUploading;

    const handlePickImage = async () => {
        try {
            const image = await pickImage(true, 'Images', 60, 0.7);
            if (image) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLocalImage({ uri: image.localUri, mimeType: image.mimeType });
            }
        } catch (error: any) {
            console.error('[AdminGlobalNotifications] Error picking image:', error);
            Toast.show({
                type: 'error',
                text1: 'Permisos',
                text2: error.message || 'No se pudo seleccionar la imagen.',
            });
        }
    };

    const handleSend = () => {
        if (!title.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Campos incompletos',
                text2: 'Por favor completa al menos el título de la notificación.',
            });
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmSend = async () => {
        setShowConfirm(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        let finalImageUrl = imageUrl.trim() || null;
        
        try {
            if (localImage) {
                setIsUploading(true);
                const uploadedUrl = await uploadMedia(
                    localImage.uri, 
                    localImage.mimeType, 
                    'notifications'
                );
                finalImageUrl = uploadedUrl;
            }
            
            sendGlobalNotification({
                variables: {
                    title: title.trim(),
                    body: body.trim(),
                    cityId: cityId === 'all' ? null : cityId,
                    saveInDb,
                    imageUrl: finalImageUrl,
                    detailed,
                    badgeText: badgeText.trim() || 'OFICIAL',
                    authorAvatarUrl: finalImageUrl,
                }
            });
        } catch (uploadError) {
            console.error('[AdminGlobalNotifications] Upload Error:', uploadError);
            Toast.show({
                type: 'error',
                text1: 'Error de subida',
                text2: 'No se pudo subir la imagen seleccionada.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header info */}
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 101, 36, 0.1)' }]}>
                    <Ionicons name="megaphone" size={24} color="#ff6524" />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Difusión de Notificaciones</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Envía un comunicado inmediato a los teléfonos de tus usuarios.
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Inputs */}
            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Título de la Notificación</Text>
                <TextInput
                    style={[
                        styles.input,
                        { 
                            color: colors.text, 
                            borderColor: colors.border, 
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                        }
                    ]}
                    placeholder="Ej. ¡Nueva actualización!"
                    placeholderTextColor={colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={60}
                    importantForAutofill="no"
                    autoComplete="off"
                    textContentType="none"
                    returnKeyType="next"
                    onSubmitEditing={() => bodyInputRef.current?.focus()}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Mensaje / Cuerpo</Text>
                <TextInput
                    ref={bodyInputRef}
                    style={[
                        styles.input,
                        styles.textArea,
                        { 
                            color: colors.text, 
                            borderColor: colors.border, 
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                        }
                    ]}
                    placeholder="Escribe el contenido del aviso aquí..."
                    placeholderTextColor={colors.textSecondary}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    numberOfLines={4}
                    maxLength={300}
                    importantForAutofill="no"
                    autoComplete="off"
                    textContentType="none"
                    returnKeyType="next"
                    onSubmitEditing={() => imageUrlInputRef.current?.focus()}
                    blurOnSubmit={true}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Imagen de la Notificación (Subida o URL)</Text>
                
                {localImage ? (
                    <View style={[styles.imagePreviewContainer, { borderColor: colors.border, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                        <Image source={{ uri: localImage.uri }} style={styles.imagePreview} />
                        <TouchableOpacity 
                            style={styles.removeImageButton} 
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setLocalImage(null);
                            }}
                        >
                            <Ionicons name="close-circle" size={26} color="#EF4444" />
                        </TouchableOpacity>
                        <Text style={[styles.imageSizeText, { color: colors.textSecondary }]}>Imagen seleccionada para subir</Text>
                    </View>
                ) : (
                    <View style={styles.imageOptionsRow}>
                        <TouchableOpacity 
                            style={[
                                styles.uploadButton, 
                                { 
                                    borderColor: colors.border, 
                                    backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                                }
                            ]}
                            onPress={handlePickImage}
                        >
                            <Ionicons name="image-outline" size={20} color={colors.primary} />
                            <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Subir Foto</Text>
                        </TouchableOpacity>
                        
                        <View style={{ flex: 1 }}>
                            <TextInput
                                ref={imageUrlInputRef}
                                style={[
                                    styles.input,
                                    { 
                                        color: colors.text, 
                                        borderColor: colors.border, 
                                        backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                                    }
                                ]}
                                placeholder="O pegue una URL..."
                                placeholderTextColor={colors.textSecondary}
                                value={imageUrl}
                                onChangeText={setImageUrl}
                                autoCapitalize="none"
                                keyboardType="url"
                                importantForAutofill="no"
                                autoComplete="off"
                                textContentType="none"
                                returnKeyType="next"
                                onSubmitEditing={() => badgeTextInputRef.current?.focus()}
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Etiqueta del aviso */}
            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Etiqueta / Tag de la Notificación</Text>
                <TextInput
                    ref={badgeTextInputRef}
                    style={[
                        styles.input,
                        { 
                            color: colors.text, 
                            borderColor: colors.border, 
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                        }
                    ]}
                    placeholder="Ej. OFICIAL, URGENTE, AVISO, EVENTO"
                    placeholderTextColor={colors.textSecondary}
                    value={badgeText}
                    onChangeText={setBadgeText}
                    maxLength={20}
                    importantForAutofill="no"
                    autoComplete="off"
                    returnKeyType="done"
                />
            </View>

            {/* Selector de Ciudad */}
            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Segmentación por Ciudad</Text>
                <TouchableOpacity
                    style={[
                        styles.selectButton,
                        { 
                            borderColor: colors.border, 
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                        }
                    ]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowCityPicker(true);
                    }}
                >
                    <Text style={[styles.selectButtonText, { color: colors.text }]}>
                        {cityId === 'all' 
                            ? 'Todas las Ciudades (Global)' 
                            : cities.find((c: any) => c.id === cityId)?.name || cityId}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Checkbox / Switch para guardar en buzón */}
            <View style={[styles.switchRow, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                <View style={styles.switchLabelContainer}>
                    <Ionicons 
                        name={saveInDb ? "bookmark" : "bookmark-outline"} 
                        size={20} 
                        color={saveInDb ? "#ff6524" : colors.textSecondary} 
                        style={styles.switchIcon}
                    />
                    <View>
                        <Text style={[styles.switchLabel, { color: colors.text }]}>
                            Guardar en buzón de Alertas
                        </Text>
                        <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                            Los usuarios verán el aviso en su bandeja de notificaciones.
                        </Text>
                    </View>
                </View>
                <Switch
                    value={saveInDb}
                    onValueChange={(val) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSaveInDb(val);
                    }}
                    trackColor={{ false: '#767577', true: 'rgba(255, 101, 36, 0.4)' }}
                    thumbColor={saveInDb ? '#ff6524' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                />
            </View>

            {/* Checkbox / Switch para vista detallada */}
            <View style={[styles.switchRow, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', marginBottom: 20 }]}>
                <View style={styles.switchLabelContainer}>
                    <Ionicons 
                        name={detailed ? "expand" : "expand-outline"} 
                        size={20} 
                        color={detailed ? "#ff6524" : colors.textSecondary} 
                        style={styles.switchIcon}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.switchLabel, { color: colors.text }]}>
                            Generar vista detallada (Grande)
                        </Text>
                        <Text style={[styles.switchSub, { color: colors.textSecondary }]} numberOfLines={2}>
                            Al pulsar el aviso se abrirá una vista detallada con la foto.
                        </Text>
                    </View>
                </View>
                <Switch
                    value={detailed}
                    onValueChange={(val) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDetailed(val);
                    }}
                    trackColor={{ false: '#767577', true: 'rgba(255, 101, 36, 0.4)' }}
                    thumbColor={detailed ? '#ff6524' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[
                    styles.submitButton, 
                    { backgroundColor: colors.primary },
                    isProcessing && { opacity: 0.8 }
                ]}
                onPress={handleSend}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <ActivityIndicator color="#FFF" size="small" />
                ) : (
                    <>
                        <Ionicons name="paper-plane" size={18} color="#FFF" style={styles.btnIcon} />
                        <Text style={styles.submitBtnText}>Enviar Difusión</Text>
                    </>
                )}
            </TouchableOpacity>

            <ConfirmModal
                visible={showConfirm}
                title="Confirmar Envío"
                message={`¿Estás seguro de que deseas enviar esta notificación a ${
                    cityId === 'all' 
                        ? 'TODOS los usuarios de todas las ciudades' 
                        : `los usuarios de ${cities.find((c: any) => c.id === cityId)?.name || cityId}`
                }?`}
                confirmText="Enviar Ahora"
                cancelText="Cancelar"
                isDestructive={false}
                onCancel={() => setShowConfirm(false)}
                onConfirm={handleConfirmSend}
            />

            <Modal 
                visible={showCityPicker} 
                transparent 
                animationType="slide" 
                onRequestClose={() => setShowCityPicker(false)}
            >
                <TouchableOpacity 
                    style={styles.pickerOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowCityPicker(false)}
                >
                    <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.pickerTitle, { color: colors.text }]}>Seleccionar Ciudad</Text>
                        
                        <TouchableOpacity
                            style={[
                                styles.pickerRow,
                                cityId === 'all' && { backgroundColor: isDark ? 'rgba(255, 101, 36, 0.15)' : 'rgba(255, 101, 36, 0.1)' }
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setCityId('all');
                                setShowCityPicker(false);
                            }}
                        >
                            <Ionicons 
                                name="globe-outline" 
                                size={20} 
                                color={cityId === 'all' ? '#ff6524' : colors.textSecondary} 
                            />
                            <Text style={[
                                styles.pickerRowText, 
                                { color: colors.text },
                                cityId === 'all' && { fontWeight: '700', color: '#ff6524' }
                            ]}>
                                Todas las Ciudades (Global)
                            </Text>
                            {cityId === 'all' && <Ionicons name="checkmark" size={20} color="#ff6524" style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>

                        {cities.map((city: any) => (
                            <TouchableOpacity
                                key={city.id}
                                style={[
                                    styles.pickerRow,
                                    cityId === city.id && { backgroundColor: isDark ? 'rgba(255, 101, 36, 0.15)' : 'rgba(255, 101, 36, 0.1)' }
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setCityId(city.id);
                                    setShowCityPicker(false);
                                }}
                            >
                                <Ionicons 
                                    name="business-outline" 
                                    size={20} 
                                    color={cityId === city.id ? '#ff6524' : colors.textSecondary} 
                                />
                                <Text style={[
                                    styles.pickerRowText, 
                                    { color: colors.text },
                                    cityId === city.id && { fontWeight: '700', color: '#ff6524' }
                                ]}>
                                    {city.name}
                                </Text>
                                {cityId === city.id && <Ionicons name="checkmark" size={20} color="#ff6524" style={{ marginLeft: 'auto' }} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 10,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 10,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 4,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(150, 150, 150, 0.2)',
        marginVertical: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
    },
    input: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    segmentedContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        justifyContent: 'space-between',
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    segmentActive: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.7,
    },
    segmentTextActive: {
        fontWeight: '700',
        opacity: 1,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    switchIcon: {
        marginRight: 10,
    },
    switchLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    switchSub: {
        fontSize: 11,
        marginTop: 2,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    btnIcon: {
        marginRight: 2,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        marginVertical: 4,
        position: 'relative',
    },
    imagePreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    removeImageButton: {
        position: 'absolute',
        top: -6,
        left: 50,
        zIndex: 10,
        backgroundColor: '#FFF',
        borderRadius: 12,
    },
    imageSizeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    imageOptionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 6,
    },
    uploadButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 12,
        marginBottom: 8,
    },
    pickerRowText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
