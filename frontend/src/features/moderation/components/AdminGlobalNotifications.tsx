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
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client/react';
import { useTheme } from '../../../theme/ThemeContext';
import { SEND_GLOBAL_NOTIFICATION } from '../graphql/moderation.operations';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

export default function AdminGlobalNotifications() {
    const { colors, isDark } = useTheme();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [cityId, setCityId] = useState<'all' | 'chunchi' | 'alausi'>('all');
    const [saveInDb, setSaveInDb] = useState(true);

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
                setCityId('all');
                setSaveInDb(true);
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

    const handleSend = () => {
        if (!title.trim() || !body.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Campos incompletos',
                text2: 'Por favor completa el título y el cuerpo del mensaje.',
            });
            return;
        }

        Alert.alert(
            'Confirmar Envío',
            `¿Estás seguro de que deseas enviar esta notificación a ${
                cityId === 'all' 
                    ? 'TODOS los usuarios de todas las ciudades' 
                    : `los usuarios de ${cityId === 'chunchi' ? 'Chunchi' : 'Alausí'}`
            }?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Enviar Ahora',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        sendGlobalNotification({
                            variables: {
                                title: title.trim(),
                                body: body.trim(),
                                cityId: cityId === 'all' ? null : cityId,
                                saveInDb,
                                imageUrl: imageUrl.trim() || null
                            }
                        });
                    }
                }
            ]
        );
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
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Mensaje / Cuerpo</Text>
                <TextInput
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
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>URL de la Imagen (Opcional)</Text>
                <TextInput
                    style={[
                        styles.input,
                        { 
                            color: colors.text, 
                            borderColor: colors.border, 
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' 
                        }
                    ]}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    placeholderTextColor={colors.textSecondary}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                />
            </View>

            {/* Selector de Ciudad */}
            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Segmentación por Ciudad</Text>
                <View style={[styles.segmentedContainer, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}>
                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            cityId === 'all' && [styles.segmentActive, { backgroundColor: colors.surface }]
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setCityId('all');
                        }}
                    >
                        <Text style={[
                            styles.segmentText,
                            { color: colors.text },
                            cityId === 'all' && styles.segmentTextActive
                        ]}>Global</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            cityId === 'chunchi' && [styles.segmentActive, { backgroundColor: colors.surface }]
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setCityId('chunchi');
                        }}
                    >
                        <Text style={[
                            styles.segmentText,
                            { color: colors.text },
                            cityId === 'chunchi' && styles.segmentTextActive
                        ]}>Chunchi</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            cityId === 'alausi' && [styles.segmentActive, { backgroundColor: colors.surface }]
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setCityId('alausi');
                        }}
                    >
                        <Text style={[
                            styles.segmentText,
                            { color: colors.text },
                            cityId === 'alausi' && styles.segmentTextActive
                        ]}>Alausí</Text>
                    </TouchableOpacity>
                </View>
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

            {/* Submit Button */}
            <TouchableOpacity
                style={[
                    styles.submitButton, 
                    { backgroundColor: colors.primary },
                    loading && { opacity: 0.8 }
                ]}
                onPress={handleSend}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                ) : (
                    <>
                        <Ionicons name="paper-plane" size={18} color="#FFF" style={styles.btnIcon} />
                        <Text style={styles.submitBtnText}>Enviar Difusión</Text>
                    </>
                )}
            </TouchableOpacity>
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
    }
});
