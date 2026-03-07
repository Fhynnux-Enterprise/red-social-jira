import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, ScrollView, TextInput, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import Toast from 'react-native-toast-message';
import { ADD_CUSTOM_FIELD, UPDATE_CUSTOM_FIELD, DELETE_CUSTOM_FIELD } from '../graphql/profile.operations';
import { useTheme, ThemeColors } from '../../../theme/ThemeContext';
import { UserCustomField } from '../services/profile.service';

interface ManageCustomFieldsProps {
    initialCustomFields: UserCustomField[];
    onCustomFieldsUpdated: (fields: UserCustomField[]) => void;
}

export default function ManageCustomFieldsSection({ initialCustomFields, onCustomFieldsUpdated }: ManageCustomFieldsProps) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const insets = useSafeAreaInsets();

    const [isCustomFieldsModalVisible, setIsCustomFieldsModalVisible] = useState(false);
    const [customFields, setCustomFields] = useState<UserCustomField[]>(initialCustomFields);

    const [newFieldTitle, setNewFieldTitle] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

    const [addCustomFieldMutation, { loading: isAddingField }] = useMutation(ADD_CUSTOM_FIELD);
    const [updateCustomFieldMutation, { loading: isUpdatingField }] = useMutation(UPDATE_CUSTOM_FIELD);
    const [deleteCustomFieldMutation] = useMutation(DELETE_CUSTOM_FIELD);

    const handleAddCustomField = async () => {
        if (!newFieldTitle.trim() || !newFieldValue.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'El título y valor son obligatorios' });
            return;
        }

        if (customFields.length >= 5 && !editingFieldId) {
            Toast.show({ type: 'error', text1: 'Límite alcanzado', text2: 'Solo puedes tener hasta 5 campos personalizados.' });
            return;
        }

        if (editingFieldId) {
            try {
                const { data } = await updateCustomFieldMutation({
                    variables: {
                        id: editingFieldId,
                        title: newFieldTitle,
                        value: newFieldValue
                    }
                });
                if (data?.updateCustomField) {
                    const newFields = customFields.map(f => f.id === editingFieldId ? data.updateCustomField : f);
                    setCustomFields(newFields);
                    onCustomFieldsUpdated(newFields);
                    setNewFieldTitle('');
                    setNewFieldValue('');
                    setEditingFieldId(null);
                    Toast.show({ type: 'success', text1: '¡Actualizado!', text2: 'Campo personalizado modificado con éxito' });
                }
            } catch (error: any) {
                console.log('Error updating custom field:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo actualizar el campo' });
            }
        } else {
            try {
                const { data } = await addCustomFieldMutation({
                    variables: {
                        title: newFieldTitle,
                        value: newFieldValue
                    }
                });

                if (data?.addCustomField) {
                    const newFields = [...customFields, data.addCustomField];
                    setCustomFields(newFields);
                    onCustomFieldsUpdated(newFields);
                    setNewFieldTitle('');
                    setNewFieldValue('');
                    Toast.show({ type: 'success', text1: '¡Añadido!', text2: 'Campo personalizado guardado con éxito' });
                }
            } catch (error: any) {
                console.log('Error adding custom field:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo guardar el campo' });
            }
        }
    };

    const handleDeleteCustomField = async (id: string) => {
        try {
            const { data } = await deleteCustomFieldMutation({ variables: { id } });
            if (data?.deleteCustomField) {
                const newFields = customFields.filter(f => f.id !== id);
                setCustomFields(newFields);
                onCustomFieldsUpdated(newFields);
                Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Campo personalizado borrado' });
            }
        } catch (error: any) {
            console.log('Error deleting custom field:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'No se pudo eliminar el campo' });
        }
    };

    const handleEditInitiate = (field: UserCustomField) => {
        setEditingFieldId(field.id);
        setNewFieldTitle(field.title);
        setNewFieldValue(field.value);
    };

    const handleCancelEdit = () => {
        setEditingFieldId(null);
        setNewFieldTitle('');
        setNewFieldValue('');
    };

    return (
        <>
            <View style={styles.sectionDivider} />
            <TouchableOpacity
                style={styles.openModalButton}
                onPress={() => {
                    setCustomFields(initialCustomFields); // ensures fresh copy
                    setIsCustomFieldsModalVisible(true);
                }}
            >
                <View>
                    <Text style={styles.sectionTitle}>Campos Personalizados</Text>
                    <Text style={styles.openModalSubtext}>
                        {customFields.length} de 5 campos añadidos
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={isCustomFieldsModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setIsCustomFieldsModalVisible(false);
                    handleCancelEdit();
                }}
            >
                <KeyboardAvoidingView
                    style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Campos personalizados</Text>
                        <TouchableOpacity onPress={() => { setIsCustomFieldsModalVisible(false); handleCancelEdit(); }}>
                            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                        {customFields.length === 0 && (
                            <Text style={styles.emptyFieldsText}>No has añadido ningún campo todavía.</Text>
                        )}

                        {customFields.map((field) => (
                            <View key={field.id} style={styles.modalFieldCard}>
                                <View style={styles.modalFieldContent}>
                                    <Text style={styles.modalFieldTitle}>{field.title}</Text>
                                    <Text style={styles.modalFieldValue} numberOfLines={1}>{field.value}</Text>
                                </View>
                                <View style={styles.modalFieldActions}>
                                    <TouchableOpacity style={styles.modalActionBtn} onPress={() => handleEditInitiate(field)}>
                                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: 'rgba(255, 102, 121, 0.1)' }]} onPress={() => handleDeleteCustomField(field.id)}>
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {(customFields.length < 5 || editingFieldId) && (
                            <View style={styles.modalFormContainer}>
                                <View style={styles.modalFormHeader}>
                                    <Text style={styles.modalFormTitle}>
                                        {editingFieldId ? 'Editar campo' : 'Nuevo campo personalizado'}
                                    </Text>
                                    {editingFieldId && (
                                        <TouchableOpacity onPress={handleCancelEdit}>
                                            <Text style={styles.cancelEditText}>Cancelar</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TextInput
                                    style={styles.modalTextInput}
                                    value={newFieldTitle}
                                    onChangeText={setNewFieldTitle}
                                    placeholder="Nombre. Ej: Instagram, Empresa"
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <TextInput
                                    style={styles.modalTextInput}
                                    value={newFieldValue}
                                    onChangeText={setNewFieldValue}
                                    placeholder="Valor. Ej: @mi_usuario, google.com"
                                    placeholderTextColor={colors.textSecondary}
                                />

                                <TouchableOpacity
                                    style={[styles.modalSaveBtn, (isAddingField || isUpdatingField) && { opacity: 0.5 }]}
                                    onPress={handleAddCustomField}
                                    disabled={isAddingField || isUpdatingField}
                                >
                                    {(isAddingField || isUpdatingField) ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name={editingFieldId ? "save-outline" : "add-circle-outline"} size={20} color="#fff" style={{ marginRight: 6 }} />
                                            <Text style={styles.addFieldBtnText}>
                                                {editingFieldId ? 'Guardar Cambios' : 'Añadir Campo'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    sectionDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    openModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    openModalSubtext: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalScrollView: {
        flex: 1,
        padding: 20,
    },
    emptyFieldsText: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginVertical: 20,
        fontSize: 16,
    },
    modalFieldCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalFieldContent: {
        flex: 1,
    },
    modalFieldTitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    modalFieldValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    modalFieldActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    modalActionBtn: {
        padding: 8,
        backgroundColor: colors.background,
        borderRadius: 8,
        marginLeft: 8,
    },
    modalFormContainer: {
        marginTop: 20,
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 40,
    },
    modalFormHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalFormTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    cancelEditText: {
        color: colors.error,
        fontWeight: 'bold',
    },
    modalTextInput: {
        color: colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        backgroundColor: colors.background,
    },
    modalSaveBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    addFieldBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
