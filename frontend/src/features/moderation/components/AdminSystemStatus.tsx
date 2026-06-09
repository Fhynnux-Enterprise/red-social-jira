import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import Toast from 'react-native-toast-message';

const GET_SYSTEM_CONFIG = gql`
  query GetSystemConfigAdmin {
    getSystemConfig {
      id
      isMaintenanceMode
      minRequiredAppVersion
      maintenanceMessage
      storeUrlIos
      storeUrlAndroid
    }
  }
`;

const UPDATE_SYSTEM_CONFIG = gql`
  mutation UpdateSystemConfig(
    $isMaintenanceMode: Boolean
    $minRequiredAppVersion: String
    $maintenanceMessage: String
    $storeUrlIos: String
    $storeUrlAndroid: String
  ) {
    updateSystemConfig(
      isMaintenanceMode: $isMaintenanceMode
      minRequiredAppVersion: $minRequiredAppVersion
      maintenanceMessage: $maintenanceMessage
      storeUrlIos: $storeUrlIos
      storeUrlAndroid: $storeUrlAndroid
    ) {
      id
      isMaintenanceMode
      minRequiredAppVersion
      maintenanceMessage
      storeUrlIos
      storeUrlAndroid
    }
  }
`;

export default function AdminSystemStatus() {
    const { colors, isDark } = useTheme();

    const { data, loading, refetch } = useQuery(GET_SYSTEM_CONFIG, {
        fetchPolicy: 'network-only',
    });

    const [updateConfig, { loading: saving }] = useMutation(UPDATE_SYSTEM_CONFIG);

    const [form, setForm] = useState({
        isMaintenanceMode: false,
        minRequiredAppVersion: '',
        maintenanceMessage: '',
        storeUrlIos: '',
        storeUrlAndroid: '',
    });

    useEffect(() => {
        if (data?.getSystemConfig) {
            const config = data.getSystemConfig;
            setForm({
                isMaintenanceMode: config.isMaintenanceMode || false,
                minRequiredAppVersion: config.minRequiredAppVersion || '1.0.0',
                maintenanceMessage: config.maintenanceMessage || 'Estamos realizando mejoras en el sistema. Volveremos pronto.',
                storeUrlIos: config.storeUrlIos || '',
                storeUrlAndroid: config.storeUrlAndroid || '',
            });
        }
    }, [data]);

    const handleSave = async () => {
        try {
            await updateConfig({
                variables: {
                    isMaintenanceMode: form.isMaintenanceMode,
                    minRequiredAppVersion: form.minRequiredAppVersion,
                    maintenanceMessage: form.maintenanceMessage,
                    storeUrlIos: form.storeUrlIos,
                    storeUrlAndroid: form.storeUrlAndroid,
                }
            });
            Toast.show({
                type: 'success',
                text1: 'Configuración guardada',
                text2: 'Los cambios del sistema han sido aplicados globalmente.',
            });
            refetch();
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error al guardar',
                text2: error.message || 'No se pudo actualizar la configuración',
            });
        }
    };

    if (loading && !data) {
        return (
            <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="construct" size={24} color={colors.error} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Modo Mantenimiento</Text>
                </View>
                
                <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.switchLabel, { color: colors.text }]}>Activar Mantenimiento</Text>
                        <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                            Bloquea el acceso a la aplicación para todos los usuarios regulares. Solo los administradores podrán entrar.
                        </Text>
                    </View>
                    <Switch
                        value={form.isMaintenanceMode}
                        onValueChange={(val) => setForm(prev => ({ ...prev, isMaintenanceMode: val }))}
                        trackColor={{ false: colors.border, true: colors.error }}
                        thumbColor={form.isMaintenanceMode ? '#fff' : '#f4f3f4'}
                    />
                </View>

                {form.isMaintenanceMode && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Mensaje a mostrar</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                            value={form.maintenanceMessage}
                            onChangeText={(text) => setForm(prev => ({ ...prev, maintenanceMessage: text }))}
                            multiline
                            placeholder="Ej. Estamos en mantenimiento..."
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                )}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="cloud-download" size={24} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Actualizaciones Forzosas</Text>
                </View>
                
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Versión mínima requerida</Text>
                    <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                        Cualquier versión menor a esta será bloqueada pidiendo actualizar (ej. 1.2.0).
                    </Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                        value={form.minRequiredAppVersion}
                        onChangeText={(text) => setForm(prev => ({ ...prev, minRequiredAppVersion: text }))}
                        placeholder="1.0.0"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Link Play Store (Android)</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                        value={form.storeUrlAndroid}
                        onChangeText={(text) => setForm(prev => ({ ...prev, storeUrlAndroid: text }))}
                        placeholder="https://play.google.com/..."
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Link App Store (iOS)</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                        value={form.storeUrlIos}
                        onChangeText={(text) => setForm(prev => ({ ...prev, storeUrlIos: text }))}
                        placeholder="https://apps.apple.com/..."
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                )}
            </TouchableOpacity>
            
            <View style={{ height: 40 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    section: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    switchDesc: {
        fontSize: 13,
        paddingRight: 10,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    inputHint: {
        fontSize: 12,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        minHeight: 48,
    },
    saveBtn: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
